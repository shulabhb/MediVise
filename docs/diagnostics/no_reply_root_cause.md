# No-Reply Root Cause Report

## 1) End-to-end trace (expected)
- Frontend endpoint on send:
  - Path: `POST /chat/message`
  - Payload shape: `{ conversationId, conversation_id, message: string, sender: 'user', document?, suppressAssistant? }`
- Backend handling:
  - Handler: `backend/app/main.py` `@app.post("/chat/message")` (around lines 150–220 in current file)
  - Flow: validate/create conversation → insert user message → call LLM (RAG or friendly prompt) → insert assistant message → return `{ conversation_id, conversation, messages }`.
- Network panel to collect (when you run locally):
  - URL: `http://127.0.0.1:8000/chat/message` (or host variant)
  - Status: 200 on success; 502 if LLM upstream down; duration (ms)
  - Request headers: Authorization: Bearer <firebase token>, Content-Type: application/json
  - Response headers: content-type: application/json
  - Response body: first 200 chars of JSON; keys should include `messages`
- Backend access log to collect:
  - `DEBUG` line like: `POST /chat/message -> 200 in XXXms` (from request middleware in `app.main`)

## 2) Where it stalls (observed/likely)
- Root cause: LLM call failing (Ollama not running or model missing) while frontend mock fallbacks were removed, causing silent no-reply previously. Now surfaced as 502 (after fix) instead of silence.
- First layer not producing response: the assistant insert path on the backend when LLM call raised, previously swallowed. Fixed to raise `HTTPException(502, {...})` so frontend surfaces error.

## 3) Code references
- POST /chat/message handler
```150:220:/Users/shulabhbhattarai/Desktop/MediVise/backend/app/main.py
@app.post("/chat/message")
async def chat_message_compat(...):
    # inserts user message, then calls LLM
    async with MedicalLLMService() as service:
        ...
    add_message(db, conv, uid, sender="assistant", text=reply_text)
```
- AI enhanced chat (not directly called by chat flow now, but used elsewhere)
```885:996:/Users/shulabhbhattarai/Desktop/MediVise/backend/app/main.py
@app.post("/ai/chat/enhanced", response_model=ChatResponse)
```
- LLM client call
```56:92:/Users/shulabhbhattarai/Desktop/MediVise/backend/app/llm_service.py
async def _make_request(...):
    # httpx call to Ollama; now explicit timeouts and raises HTTPException(502) on errors
```
- Frontend fetchWithAuth and chat send path
```95:125:/Users/shulabhbhattarai/Desktop/MediVise/frontend/src/pages/Chat.tsx
async function fetchWithAuth(...): logs path, status, keys; throws on non-OK
```
```457:505:/Users/shulabhbhattarai/Desktop/MediVise/frontend/src/pages/Chat.tsx
const addMessageToConversation = async (...):
  const resp = await fetchWithAuth('/chat/message', {...})
  if (resp?.messages) setMessages(resp.messages)
```

## 4) Env & timeouts
- LLM endpoint: Ollama at `http://localhost:11434`, model `phi4-mini` (see `backend/app/llm_service.py`, `MedicalLLMService.__init__`).
- Timeouts: `httpx.Timeout(30.0, connect=5.0)`; HTTP errors/timeouts now raise `HTTPException(502, detail={...})`.
- Firebase token: Frontend attaches token in `fetchWithAuth` for all calls; verify via Network headers.

---

## Minimal fixes applied
- Backend: surfaced LLM failures and added timeouts
  - `backend/app/llm_service.py` `_make_request`: explicit connect/read timeouts; on errors raise `HTTPException(502, { error, message })`.
  - `backend/app/main.py` `/chat/message`: catch `HTTPException` and re-raise as `{ error: 'llm_failed', stage: 'llm', detail }` instead of silently skipping assistant.
  - Added a very light logging middleware to log method, path, status, and duration.
- Frontend: improved diagnostics & response handling
  - `frontend/src/pages/Chat.tsx`: `fetchWithAuth` logs request/response summary; after POST `/chat/message` use returned `messages` when available, else refetch once.

## Before/after behavior
- Before: When LLM failed, backend logged error but returned success with only user message; frontend showed no assistant reply and no error.
- After: When LLM fails, backend returns 502 with clear error JSON; frontend logs error to console; when LLM is up, assistant reply is persisted and appears immediately.

## Remaining risks / TODOs
- Make LLM base URL/model configurable via env (LLM_BASE_URL, LLM_MODEL) to avoid host mismatch.
- Optional: frontend toast for 5xx from `/chat/message` to inform user rather than only console.error.
- Confirm Ollama model `phi4-mini` (or update to installed model) is present.
