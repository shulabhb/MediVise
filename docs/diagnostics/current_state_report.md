# 1. Project Map

- Top-level:
  - `backend/` FastAPI app, models, OCR, memory, LLM integration
  - `frontend/` Vite + React SPA
  - `docs/` diagnostics and analysis
- Key backend subfolders/files:
  - `backend/app/main.py` (FastAPI app, CORS, chat/doc/memory routes, include routers)
  - `backend/app/auth.py` (Firebase auth dependency)
  - `backend/app/database.py` (SQLAlchemy engine/session, `create_tables()`)
  - `backend/app/models.py` (User, Conversation, Message, Document)
  - `backend/app/models_medication.py`, `models_appointment.py`, `models_ocr.py`, `models_memory.py`
  - `backend/app/routers/medications.py`, `routers/appointments.py`, `routers_ocr.py`
  - `backend/app/llm_service.py`, `llm_prompts.py`, `retrieval.py`, `textops.py`, `pdf_context_extractor.py`, `ocr_service.py`
- Frontend key files:
  - `frontend/src/pages/Chat.tsx`, `Documents.tsx`, `Appointments.tsx`, `Medications.tsx`
  - `frontend/src/services/medicalAI.ts`
  - `frontend/src/context/AuthContext.tsx`, `frontend/src/lib/firebase.ts`
  - `frontend/src/App.tsx`

- Frontend package scripts (`frontend/package.json`):
```1:33:/Users/shulabhbhattarai/Desktop/MediVise/frontend/package.json
{
  "name": "frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "firebase": "^12.3.0",
    "react": "^19.1.1",
    "react-dom": "^19.1.1",
    "react-markdown": "^10.1.0",
    "react-router-dom": "^7.9.1",
    "remark-gfm": "^4.0.1"
  },
  "devDependencies": {
    "@eslint/js": "^9.36.0",
    "@types/react": "^19.1.13",
    "@types/react-dom": "^19.1.9",
    "@vitejs/plugin-react": "^5.0.3",
    "eslint": "^9.36.0",
    "eslint-plugin-react-hooks": "^5.2.0",
    "eslint-plugin-react-refresh": "^0.4.20",
    "globals": "^16.4.0",
    "typescript": "~5.8.3",
    "typescript-eslint": "^8.44.0",
    "vite": "^7.1.7"
  }
}
```

- Backend requirements: see `backend/requirements.txt` (not fully enumerated here).

- ENV names referenced (names only, not secrets):
  - Backend: `DATABASE_URL` (database), `GOOGLE_APPLICATION_CREDENTIALS` (Firebase Admin), `OCR_UPLOAD_DIR` (uploads), `TESSERACT_CMD` (tesseract path)
  - Frontend: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`


# 2. Auth & User Scoping

- Firebase token verification: `backend/app/auth.py` `get_current_user` verifies Bearer token via Firebase Admin SDK.
```29:37:/Users/shulabhbhattarai/Desktop/MediVise/backend/app/auth.py
async def get_current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)):
    if creds is None or creds.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = creds.credentials
    try:
        decoded = fb_auth.verify_id_token(token)
        return decoded  # includes uid, email, etc.
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc
```

- `user_id` flow into handlers: Dependency `current_user: dict = Depends(get_current_user)` is used across routes; `uid = current_user.get("uid")` is then applied to filter queries or associate records.
  - Example in documents list:
```288:293:/Users/shulabhbhattarai/Desktop/MediVise/backend/app/main.py
@app.get("/documents")
def get_documents(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    uid = current_user.get("uid")
    docs = db.query(DocumentModel).filter(DocumentModel.user_id == uid).order_by(DocumentModel.uploaded_at.desc()).all()
    return [ _doc_to_json(d) for d in docs ]
```

- Where scoping is enforced in queries (examples):
```668:675:/Users/shulabhbhattarai/Desktop/MediVise/backend/app/main.py
# summarize_document_by_id
uid = current_user.get("uid")
# Get the document
doc = db.query(DocumentModel).filter(
    DocumentModel.id == doc_id, 
    DocumentModel.user_id == uid
).first()
```
```1009:1017:/Users/shulabhbhattarai/Desktop/MediVise/backend/app/main.py
# ask_document_question_enhanced
uid = current_user.get("uid")
# Get the document
doc = db.query(DocumentModel).filter(
    DocumentModel.id == doc_id, 
    DocumentModel.user_id == uid
).first()
```
```20:23:/Users/shulabhbhattarai/Desktop/MediVise/backend/app/routers/medications.py
q = db.query(Medication).filter(Medication.user_id == user_id)
```
```68:76:/Users/shulabhbhattarai/Desktop/MediVise/backend/app/routers/appointments.py
appointment = db.query(Appointment).filter(
    Appointment.id == appointment_id,
    Appointment.user_id == user_id
).first()
if not appointment:
    raise HTTPException(status_code=404, detail="Appointment not found")
```


# 3. Database Schema (current)

- SQLAlchemy Base: `backend/app/models.py` defines core tables; additional modules define feature tables.

- Core tables:
  - `users` (`id` PK, `firebase_uid` unique, `username` unique, `email` unique, timestamps)
  - `conversations` (`id` PK, `user_id` string, `title`, `last_message`, `starred`, timestamps)
  - `messages` (`id` PK, `text`, `sender`, `created_at`, `document_data`, FK `conversation_id` → `conversations.id`)
  - `documents` (`id` PK, `user_id`, `filename`, `original_name`, `file_path`, `file_size`, `content_preview`, `full_content`, `document_type`, `uploaded_at`, optional FK `conversation_id`)
```8:71:/Users/shulabhbhattarai/Desktop/MediVise/backend/app/models.py
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    firebase_uid = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    # ...
class Conversation(Base):
    __tablename__ = "conversations"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(128), nullable=True)
    # ...
class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    # ...
    conversation_id = Column(Integer, ForeignKey("conversations.id"))
class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(128), nullable=True)
    # ...
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=True)
```

- Medications: `backend/app/models_medication.py` (`medications`)
  - PK `id`; `user_id`; `name`, `generic_name`; dose fields; `frequency`; dates; flags; provider/pharmacy; refs; reminders; timestamps.
```25:61:/Users/shulabhbhattarai/Desktop/MediVise/backend/app/models_medication.py
class Medication(Base):
    __tablename__ = "medications"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    name: Mapped[str] = mapped_column(String(256))
    # ...
    source_document_id: Mapped[Optional[int]] = mapped_column(ForeignKey("documents.id"), nullable=True)
    # ...
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

- Appointments: `backend/app/models_appointment.py` (`appointments`)
  - PK `id`; `user_id`; info fields; status/type enums; schedule times; contact/provider; reminders; related JSON; costs; timestamps.
```24:79:/Users/shulabhbhattarai/Desktop/MediVise/backend/app/models_appointment.py
class Appointment(Base):
    __tablename__ = "appointments"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    # ...
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

- OCR: `backend/app/models_ocr.py`
  - `ocr_documents` with `id` PK, `user_id`, `filename`, `mime_type`, `storage_path`, `language_used`, `ocr_engine`, `status`, `num_pages`, `processing_ms`, `full_text`, `created_at`.
  - `ocr_document_pages` per-page text with `document_id` FK.
```18:34:/Users/shulabhbhattarai/Desktop/MediVise/backend/app/models_ocr.py
class OCRDocument(Base):
    __tablename__ = "ocr_documents"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(128), nullable=True)
    filename: Mapped[str] = mapped_column(String(512))
    mime_type: Mapped[str] = mapped_column(String(128))
    storage_path: Mapped[str] = mapped_column(String(1024))
    # ...
```

- Memory: `backend/app/models_memory.py`
  - `user_memories` with `id` PK, `user_id`, `category`, `key`, `value` (JSON string), `confidence`, `source`, timestamps, `is_active`, `access_count`.
  - `document_contexts` with per-document extracted context fields.
  - `memory_interactions` to log creation/updates/access.
```14:33:/Users/shulabhbhattarai/Desktop/MediVise/backend/app/models_memory.py
class UserMemory(Base):
    __tablename__ = "user_memories"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(128), nullable=False, index=True)
    category = Column(String(64), nullable=False, index=True)
    key = Column(String(128), nullable=False, index=True)
    value = Column(Text, nullable=False)
    confidence = Column(Float, default=1.0)
    # ...
```

- Table creation: `backend/app/database.py` and startup in `main.py`.
```25:28:/Users/shulabhbhattarai/Desktop/MediVise/backend/app/database.py
def create_tables():
    Base.metadata.create_all(bind=engine)
```
```83:90:/Users/shulabhbhattarai/Desktop/MediVise/backend/app/main.py
@app.on_event("startup")
def startup_event():
    try:
        create_tables()
        _ensure_sqlite_columns()
        # Also create memory tables
        MemoryBase.metadata.create_all(bind=engine)
        print("Database tables created successfully")
    except Exception as e:
        print(f"Database connection failed: {e}")
```


# 4. Chat Flow (end-to-end)

- Backend chat-related endpoints (in `backend/app/main.py`):
  - `GET /chat/conversations` → list in-memory per-user conversations
  - `POST /chat/conversations` → create in-memory conversation
  - `GET /chat/conversations/{conv_id}` → get messages
  - `PATCH /chat/conversations/{conv_id}` → update title/starred
  - `DELETE /chat/conversations/{conv_id}` → delete
  - `POST /chat/message` → append a message to current user's in-memory conversation, optionally generates assistant echo
  - `POST /chat/send` → simple compat endpoint returning echo reply
```213:271:/Users/shulabhbhattarai/Desktop/MediVise/backend/app/main.py
@app.get("/chat/conversations")
# ...
@app.post("/chat/conversations")
# ...
@app.get("/chat/conversations/{conv_id}")
# ...
@app.delete("/chat/conversations/{conv_id}")
# ...
@app.patch("/chat/conversations/{conv_id}")
# ...
@app.post("/chat/message")
# ...
```

- Input/output shapes:
  - `POST /chat/message`: accepts JSON with `conversation_id|conversationId`, `message` (string or object with `text`, optional `sender`, `suppressAssistant`, `document`). Returns `conversation` object with `messages` array; persists only in memory (`CONVERSATIONS` dict), not DB.
```153:211:/Users/shulabhbhattarai/Desktop/MediVise/backend/app/main.py
@app.post("/chat/message")
# ...
conv["messages"].append(message_obj)
if message_obj["sender"] == "user" and not message_obj["suppressAssistant"]:
    assistant_msg = {
        "id": str(uuid.uuid4()),
        "text": "Thanks, I received your message.",
        "sender": "assistant",
        "timestamp": datetime.now().isoformat(),
    }
    conv["messages"].append(assistant_msg)
return { "conversation_id": conv_id, "conversation": conv, "messages": conv["messages"] }
```

- Assistant persistence: assistant replies for `/chat/message` are added to in-memory `conv["messages"]`. No DB save for messages at present.

- Conversation history fetch: `GET /chat/conversations/{id}` returns in-memory `conv`.

- LLM prompt construction and usage:
  - Enhanced summary/QA use `MedicalLLMService` with templates in `llm_prompts.py` and prompt assembly in `llm_service.py`.
```163:247:/Users/shulabhbhattarai/Desktop/MediVise/backend/app/llm_service.py
async def summarize_text_map_reduce(self, text: str, style: str = "patient-friendly", doc_id: Optional[int] = None) -> SummaryResponse:
    deidentified_text, redactions_applied = deidentify_phi(text)
    chunks = chunk_text_with_overlap(deidentified_text)
    # Map phase over chunks using SUMMARY_SYSTEM and SUMMARY_USER_TEMPLATE
    # Reduce phase combines partials using SUMMARY_REDUCE_TEMPLATE
    # Builds SummaryResponse with sections and risks
```
```253:286:/Users/shulabhbhattarai/Desktop/MediVise/backend/app/llm_service.py
async def rag_answer(self, question: str, snippets: List[DocumentSnippet]) -> ChatResponse:
    snippets_text = ""; citations = []
    for i, snippet in enumerate(snippets, 1):
        snippets_text += f"Snippet {i} ({snippet.citation}):\n{snippet.text}\n\n"
        citations.append(snippet.citation)
    user_prompt = QA_USER_TEMPLATE.format(question=question, snippets=snippets_text)
    answer = await self._make_request(user_prompt, QA_SYSTEM)
    return ChatResponse(answer=answer, citations=citations, context_used=len(snippets) > 0, ...)
```
  - Chat endpoints using LLM:
    - `POST /ai/chat` basic conversational mode, constructs a friendly system prompt dynamically, calls `_make_request`.
```743:831:/Users/shulabhbhattarai/Desktop/MediVise/backend/app/main.py
async def conversational_medical_chat(...):
    # Build context_info from request.user_documents and request.conversation_history
    system_prompt = f"""You are a friendly AI health assistant.\n...\nRespond ..."""
    response = await service._make_request(request.user_message, system_prompt)
```
    - `POST /ai/chat/enhanced` decides `should_use_memory`, fetches documents and relevant user memories, runs retrieval via `retrieval.extract_snippets*`, and calls `service.rag_answer`.
```885:992:/Users/shulabhbhattarai/Desktop/MediVise/backend/app/main.py
use_mem = should_use_memory(request.user_message)
# collect docs (max 5 recent with full_content), relevant user_memories (limit=5),
# keywords from conversation, then extract_snippets_by_document(..., max_snippets_per_doc=2)
result = await service.rag_answer(request.user_message, enhanced_snippets)
await memory_service.learn_from_chat(db, uid, request.user_message, result.answer, {...})
```

- Document retrieval invocation and limits:
  - Single doc: `extract_snippets(full_text, query, max_snippets=6, window=450)`
  - Multi-doc: `extract_snippets_by_document(documents, query, max_snippets_per_doc=3)`; adds citation prefix `doc:{id} Lstart-end`
```5:17:/Users/shulabhbhattarai/Desktop/MediVise/backend/app/retrieval.py
def extract_snippets(full_text: str, query: str, max_snippets: int = 6, window: int = 450) -> List[DocumentSnippet]:
    # keyword windowing with simple density scoring
```
```79:112:/Users/shulabhbhattarai/Desktop/MediVise/backend/app/retrieval.py
def extract_snippets_by_document(documents: List[Dict], query: str, max_snippets_per_doc: int = 3) -> List[DocumentSnippet]:
    # prefixes citations with doc:{id}
```

- Post-processing: PHI de-identification via `textops.deidentify_phi` is applied in summarization map-reduce; citations format enforced in prompts.
```67:101:/Users/shulabhbhattarai/Desktop/MediVise/backend/app/textops.py
def deidentify_phi(text: str) -> Tuple[str, bool]:
    # regex redactions for names, phones, SSN, email, addresses, MRN, Patient ID
```


# 5. Memory System (today)

- Files and functions that create/update memories: `backend/app/user_memory_service.py`
  - Build from document context: `extract_and_store_document_context` → `_build_memories_from_context` → `_create_or_update_memory`
```41:91:/Users/shulabhbhattarai/Desktop/MediVise/backend/app/user_memory_service.py
async def extract_and_store_document_context(...):
    context_data = self.context_extractor.extract_context(text)
    doc_context = db.query(DocumentContext)...
    db.commit(); db.refresh(doc_context)
    await self._build_memories_from_context(db, user_id, doc_context)
```
```97:152:/Users/shulabhbhattarai/Desktop/MediVise/backend/app/user_memory_service.py
async def _build_memories_from_context(...):
    # iterates through medications/conditions/allergies/vitals/labs and calls _create_or_update_memory
```
```154:191:/Users/shulabhbhattarai/Desktop/MediVise/backend/app/user_memory_service.py
async def _create_or_update_memory(...):
    memory = db.query(UserMemory).filter(UserMemory.user_id==user_id, ...).first()
    if memory:
        memory.value = json.dumps(value)
        memory.confidence = min(1.0, memory.confidence + 0.1)
        memory.last_updated = datetime.utcnow()
        memory.source = source
    else:
        memory = UserMemory(...)
        db.add(memory)
    # Logs MemoryInteraction immediately (uses memory.id if present)
```
  - Learnings from chat: `learn_from_chat` → `_extract_learnings_from_chat` uses regexes for medications/conditions/preferences.
```195:223:/Users/shulabhbhattarai/Desktop/MediVise/backend/app/user_memory_service.py
async def learn_from_chat(...):
    learnings = self._extract_learnings_from_chat(user_message, ai_response, context)
    for learning in learnings:
        await self._create_or_update_memory(...)
    db.commit()
```
```224:279:/Users/shulabhbhattarai/Desktop/MediVise/backend/app/user_memory_service.py
def _extract_learnings_from_chat(...):
    # regex patterns for medications, conditions, preferences
```

- Confidence/last_updated/access_count handling:
  - New memories created with `confidence=0.8` (context) or updated `+0.1` up to 1.0; `last_updated` set when updating.
  - Access increments in `get_relevant_memories` and logs `MemoryInteraction('accessed')`.
```314:325:/Users/shulabhbhattarai/Desktop/MediVise/backend/app/user_memory_service.py
for memory in memories:
    memory.access_count += 1
    db.add(MemoryInteraction(user_id=user_id, memory_id=memory.id, interaction_type='accessed', context=f"Query: {query}"))
```

- Known bug check: `_create_or_update_memory` logs a `MemoryInteraction` referencing `memory.id` without ensuring `flush/commit` for new records; interactions for brand new memories may record `0` before id assignment. Consider `db.flush()` before logging.

- Retrieving relevant memories: `get_relevant_memories` builds conditions by `user_id`, `is_active`, optional categories based on query keywords; sorts by `confidence` desc, then `access_count`, then `last_updated`; limit param.
```281:347:/Users/shulabhbhattarai/Desktop/MediVise/backend/app/user_memory_service.py
memories = db.query(UserMemory).filter(and_(*conditions)).order_by(desc(UserMemory.confidence), desc(UserMemory.access_count), desc(UserMemory.last_updated)).limit(limit).all()
```


# 6. Documents / OCR / Indexing

- Upload routes used by frontend:
  - `POST /documents/upload` (Chat and Documents pages)
```293:385:/Users/shulabhbhattarai/Desktop/MediVise/backend/app/main.py
@app.post("/documents/upload")
# saves to /tmp/medivise_docs, runs OCR/native extraction, stores Document and DocumentContext
```
  - OCR-specific ingestion: `POST /api/ocr/ingest` (not directly used by current frontend docs flow, but available).
```29:100:/Users/shulabhbhattarai/Desktop/MediVise/backend/app/routers_ocr.py
@router.post("/ingest")
# verifies MIME, writes to OCR_UPLOAD_DIR, runs ocr_pages_from_bytes, persists OCRDocument and DocumentPage
```

- Ingestion pipeline:
  - For `/documents/upload`, saves file, tries native PDF text extraction via `ocr_service.ocr_pages_from_bytes` which first attempts PyPDF2 native text; if none, falls back to pdf2image + Tesseract OCR; returns both per-page results and `full_text`.
```19:66:/Users/shulabhbhattarai/Desktop/MediVise/backend/app/ocr_service.py
def ocr_pages_from_bytes(data: bytes, mime_type: str, lang: str = "eng"):
    # Try native PyPDF2 extract_text; else convert pages and OCR with Tesseract
    # returns (results, full_text, processing_ms)
```
  - On success, `/documents/upload` stores `documents` row with `content_preview` and `full_content` and then runs `PDFContextExtractor.extract_context` to populate `document_contexts` for the document.
```353:377:/Users/shulabhbhattarai/Desktop/MediVise/backend/app/main.py
context_data = context_extractor.extract_context(full_content)
# creates DocumentContext and commits
```

- Light index (token → page) implementation: there is no token index table; retrieval is lightweight regex/keyword windowing in `retrieval.py` using character windows and simple density scoring.

- Citations format: `extract_snippets` produces citations like `L{start}-{end}`; `extract_snippets_by_document` prefixes with `doc:{doc_id}`; summarization uses `p{page}:L{start}-{end}` anchors in templates; enhanced doc QA prefixes doc id.
```55:66:/Users/shulabhbhattarai/Desktop/MediVise/backend/app/retrieval.py
citation = f"L{start}-{end}"
```
```103:106:/Users/shulabhbhattarai/Desktop/MediVise/backend/app/retrieval.py
snippet.citation = f"doc:{doc['id']} {snippet.citation}"
```


# 7. Medications & Appointments

- Medications endpoints (`backend/app/routers/medications.py`), all scoped by `user_id` from token:
  - `GET /api/medications` (optional `is_active` filter); response model `List[MedicationOut]`.
  - `POST /api/medications` (payload `MedicationCreate`); forces `user_id` to current user.
  - `PATCH /api/medications/{med_id}` (payload `MedicationUpdate`), requires ownership.
  - `DELETE /api/medications/{med_id}` (requires ownership).
```12:23:/Users/shulabhbhattarai/Desktop/MediVise/backend/app/routers/medications.py
@router.get("", response_model=List[MedicationOut])
# ...
q = db.query(Medication).filter(Medication.user_id == user_id)
```

- Appointments endpoints (`backend/app/routers/appointments.py`), scoped by `user_id`:
  - `GET /api/appointments` with optional `status`, `appointment_type`, `upcoming_only` filters.
  - `POST /api/appointments` (payload `AppointmentCreate`), sets `user_id`, infers `end_time` from `scheduled_date` + `duration_minutes` if missing.
  - `PATCH /api/appointments/{appointment_id}` recalculates `end_time` if schedule/duration changes.
  - `DELETE /api/appointments/{appointment_id}` requires ownership.
```21:33:/Users/shulabhbhattarai/Desktop/MediVise/backend/app/routers/appointments.py
q = db.query(Appointment).filter(Appointment.user_id == user_id)
```

- Validation schemas: `backend/app/schemas_medication.py`, `schemas_appointment.py` define fields, defaults, and validators (non-negative, positive integers, etc.).

- Current frontend usage:
  - Pages exist for `Medications.tsx` and `Appointments.tsx`; not analyzed here for brevity, but routing is set in `src/App.tsx` to protected routes.


# 8. Frontend Chat UI & Services

- Components rendering messages and sending requests:
  - `frontend/src/pages/Chat.tsx` handles conversations CRUD via `/chat/*` endpoints and AI via `medicalAI` service. Shows markdown with `react-markdown` + `remark-gfm` and renders citations when present.
```457:573:/Users/shulabhbhattarai/Desktop/MediVise/frontend/src/pages/Chat.tsx
const addMessageToConversation = async (message: Message, opts?: { suppressAssistant?: boolean }) => {
  const resp = await fetchWithAuth('/chat/message', { method: 'POST', body: JSON.stringify({...}) })
  if (message.sender === 'user' && !opts?.suppressAssistant) {
    const chatResponse = await medicalAI.getEnhancedMedicalChatResponse(...)
    await fetchWithAuth('/chat/message', { method: 'POST', body: JSON.stringify({...}) })
    // then refresh conversation
  }
}
```
  - Conversation list and menu use `/chat/conversations` endpoints for CRUD.

- Service call functions (`frontend/src/services/medicalAI.ts`):
  - Base URL hardcoded: `http://127.0.0.1:8000`
  - Endpoints hit: `/ai/summarize`, `/ai/ask-question`, `/ai/summarize-document/{id}`, `/ai/ask-document-question/{id}`, `/ai/chat`, `/ai/chat/enhanced`, and `/documents` for listing.
  - Headers include `Authorization: Bearer {token}`; retry logic (`fetchWithRetry`) used for enhanced calls.
```27:36:/Users/shulabhbhattarai/Desktop/MediVise/frontend/src/services/medicalAI.ts
class MedicalAIService {
  private baseURL = 'http://127.0.0.1:8000';
  private getAuthHeaders(token: string): HeadersInit { /* ... */ }
```

- Markdown rendering: `Chat.tsx` uses `ReactMarkdown` with custom components for headings, lists, code, etc.

- Bubble layout and styling: `App.css` (not quoted); `Chat.tsx` contains structural CSS classes and inline styles for chips/indicators.

- Attachment flow (PDF upload): in `Chat.tsx`, file upload calls `POST /documents/upload` and then posts messages noting upload; it stores a session-attached document to hint the next message.
```356:414:/Users/shulabhbhattarai/Desktop/MediVise/frontend/src/pages/Chat.tsx
const handleFileUpload = async (file: File) => {
  const docRes = await fetch(`${BASE_URL}/documents/upload`, { method: 'POST', headers: { Authorization }, body: form })
  // add messages to conversation via /chat/message
}
```


# 9. CORS, Ports, and Hosts

- Current CORS config in backend:
```38:57:/Users/shulabhbhattarai/Desktop/MediVise/backend/app/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://127.0.0.1:5173",
        "http://localhost:5174", 
        "http://127.0.0.1:5174",
        "http://localhost:5175", 
        "http://127.0.0.1:5175",
        "http://localhost:5176", 
        "http://127.0.0.1:5176",
        "http://localhost:5177", 
        "http://127.0.0.1:5177",
        "http://localhost:5178", 
        "http://127.0.0.1:5178"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

- Hardcoded URLs and localhost vs 127.0.0.1:
  - Frontend uses `http://127.0.0.1:8000` in `Chat.tsx`, `Documents.tsx`, `AuthContext.tsx`, and `medicalAI.ts`.
  - CORS allows both `localhost` and `127.0.0.1` on several ports, so cross-host should be allowed.

- Cross-host behavior: Not executed in this environment; validate locally per runbook.


# 10. Observed Logs & Traces

- Not executed here. When running locally, collect:
  - Uvicorn logs on startup, DB echo SQL (enabled via `engine = create_engine(DATABASE_URL, echo=True, ...)`).
  - Browser console errors/warnings from `Chat` and `Documents` pages when calling `/chat/*`, `/documents/*`, `/ai/*`.
  - Network tab entries: URL, method, status, content-type, size for the above endpoints.


# 11. Gaps & Risks (ranked)

1. In-memory chat storage only: `/chat/*` endpoints do not persist to DB; conversations/messages are ephemeral.
2. Memory interaction logging may use `memory.id` before flush; potential `0` memory_id in interaction rows.
3. LLM service depends on local Ollama (`http://localhost:11434`) and will error if unavailable.
4. PHI de-identification applied to summarization only; RAG chat may quote raw text.
5. Separate SQLAlchemy bases for core vs memory models complicate migrations; ad hoc SQLite `ALTER TABLE` on startup.
6. Hardcoded backend base URL in frontend; no `VITE_API_BASE`.
7. Local disk storage for docs under `/tmp/medivise_docs` and `./uploads` without lifecycle management.


# 12. Ready-to-Act Next Steps

- Next (tone/memory balance):
  - `backend/app/user_memory_service.py::_create_or_update_memory`: add `db.flush()` after new `UserMemory` add before logging interaction.
  - Review when to preface memory-based answers; current logic adds preface when context used.

- Then (tool calls for meds/appts):
  - `frontend/src/services/medicalAI.ts`: support `VITE_API_BASE` and default to current base.
  - Ensure meds/appts pages wire to `/api/medications` and `/api/appointments` with auth headers.

- Later (embeddings, SSE streaming):
  - Add embeddings + chunk tables; replace `retrieval.py` with vector search and real citations.
  - Stream responses via SSE in `/ai/chat/enhanced`; update frontend to stream.
  - Introduce proper Alembic migrations; remove SQLite ALTERs; unify metadata.


# Appendices

- Example requests/responses
  - Create conversation:
```137:151:/Users/shulabhbhattarai/Desktop/MediVise/backend/app/main.py
@app.post("/chat/send")
# Returns { conversation_id, message: { id, text, sender, timestamp } }
```
  - Post chat message:
```153:211:/Users/shulabhbhattarai/Desktop/MediVise/backend/app/main.py
@app.post("/chat/message")
# body accepts conversationId/conversation_id + message text; returns conversation with messages
```
  - Get enhanced chat:
```885:992:/Users/shulabhbhattarai/Desktop/MediVise/backend/app/main.py
@app.post("/ai/chat/enhanced", response_model=ChatResponse)
```
  - Upload document:
```293:385:/Users/shulabhbhattarai/Desktop/MediVise/backend/app/main.py
@app.post("/documents/upload")
```
  - OCR ingest (optional):
```29:100:/Users/shulabhbhattarai/Desktop/MediVise/backend/app/routers_ocr.py
@router.post("/ingest")
```

- Small sequence diagram (text)

User → Frontend Chat: type message and send
Frontend → Backend `/chat/message`: persist user message to in-memory conversation
Frontend → Backend `/ai/chat/enhanced`: request AI with conversation history + docs
Backend → DB: fetch recent user documents; retrieve snippets
Backend → LLM: call Ollama with QA prompt and snippets
Backend → Memory: learn from chat; log interactions
Backend → Frontend: return `ChatResponse` with answer + citations
Frontend → Backend `/chat/message`: persist assistant message to in-memory conversation
Frontend: renders markdown answer and citations


# Questions for clarification

- Should conversations/messages be persisted to DB (`conversations`, `messages`) instead of in-memory `CONVERSATIONS`? If yes, clarify desired schema/fields.
- Confirm expected Ollama model and base URL. Should we add configuration via env (`LLM_BASE_URL`, `LLM_MODEL`)?
- Do we want a `VITE_API_BASE` env on the frontend to decouple base URL from code?
- What is the long-term plan for document storage (disk path, retention, S3/Supabase)?
- Should PHI de-identification be expanded to RAG answers as well?
- Unify SQLAlchemy metadata across modules or proceed with separate `Base`s and explicit creates?
