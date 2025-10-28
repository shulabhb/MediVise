from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List, Dict
from sqlalchemy.orm import Session
import os
import uuid
import shutil
from datetime import datetime
import json
from .auth import get_current_user
from .database import get_db, create_tables, engine
from sqlalchemy import text
from .models import User, Conversation, Message as MessageModel, Document as DocumentModel
from .models_medication import Medication
from .models_appointment import Appointment
from .models_ocr import OCRDocument
from .llm_service import summarize_document, answer_question, MedicalLLMService
from .schemas_summary import SummaryRequest, SummaryResponse, ChatResponse, DocumentSnippet
from .retrieval import extract_snippets_by_document, extract_keywords_from_conversation

app = FastAPI(title="MediVise API", version="0.1.0")

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

def _column_exists(conn, table: str, column: str) -> bool:
    try:
        result = conn.execute(text(f"PRAGMA table_info('{table}')"))
        cols = [row[1] for row in result.fetchall()]
        return column in cols
    except Exception:
        return False

def _ensure_sqlite_columns():
    # Add user_id columns if missing (SQLite only)
    with engine.begin() as conn:
        # ocr_documents.user_id
        if _column_exists(conn, "ocr_documents", "id") and not _column_exists(conn, "ocr_documents", "user_id"):
            conn.execute(text("ALTER TABLE ocr_documents ADD COLUMN user_id TEXT"))
        # documents.user_id
        if _column_exists(conn, "documents", "id") and not _column_exists(conn, "documents", "user_id"):
            conn.execute(text("ALTER TABLE documents ADD COLUMN user_id TEXT"))
        # messages.user_id
        if _column_exists(conn, "messages", "id") and not _column_exists(conn, "messages", "user_id"):
            conn.execute(text("ALTER TABLE messages ADD COLUMN user_id TEXT"))
        # conversations.user_id
        if _column_exists(conn, "conversations", "id") and not _column_exists(conn, "conversations", "user_id"):
            conn.execute(text("ALTER TABLE conversations ADD COLUMN user_id TEXT"))

@app.on_event("startup")
def startup_event():
    try:
        create_tables()
        _ensure_sqlite_columns()
        print("Database tables created successfully")
    except Exception as e:
        print(f"Database connection failed: {e}")

# Include OCR router
from .routers_ocr import router as ocr_router
app.include_router(ocr_router)
# Remove in-memory docs; use DB for documents
# In-memory conversations store keyed by uid → conv_id → conversation
CONVERSATIONS: dict = {}


# Include other routers
from .routers.medications import router as medications_router
from .routers.appointments import router as appointments_router
app.include_router(medications_router)
app.include_router(appointments_router)

@app.get("/")
def read_root():
    return {"Hello": "MediVise API"}

@app.get("/test")
def test():
    return {"status": "OK", "message": "Backend is working"}

# Essential routes for the frontend
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime

class Message(BaseModel):
    id: str
    text: str
    sender: Optional[str] = "user"
    timestamp: datetime
    document: Optional[dict] = None
    suppressAssistant: Optional[bool] = False

class ChatMessage(BaseModel):
    conversation_id: Optional[str] = None
    message: Message

@app.post("/chat/send")
def send_chat_message(chat_message: ChatMessage, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Send a chat message"""
    user_id = current_user.get("uid")
    
    # For now, just return a simple response
    return {
        "conversation_id": chat_message.conversation_id or str(uuid.uuid4()),
        "message": {
            "id": str(uuid.uuid4()),
            "text": "I received your message: " + chat_message.message.text,
            "sender": "assistant",
            "timestamp": datetime.now()
        }
    }

# Compat endpoint expected by frontend
@app.post("/chat/message")
def chat_message_compat(payload: dict = Body(...), current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    uid = current_user.get("uid")
    conv_id = payload.get("conversation_id") or payload.get("conversationId") or str(uuid.uuid4())

    raw_msg = payload.get("message")
    top_sender = payload.get("sender")
    top_suppress = payload.get("suppressAssistant")
    top_doc = payload.get("document")

    if isinstance(raw_msg, str):
        msg = {"text": raw_msg}
    elif isinstance(raw_msg, dict):
        msg = raw_msg
    else:
        msg = {}

    sender = (msg.get("sender") or top_sender or "user")
    suppress_assistant = (
        (msg.get("suppressAssistant") if "suppressAssistant" in msg else None)
    )
    if suppress_assistant is None:
        suppress_assistant = bool(top_suppress) if top_suppress is not None else False
    document = msg.get("document") or top_doc or None

    message_obj = {
        "id": msg.get("id") or str(uuid.uuid4()),
        "text": msg.get("text") or "",
        "sender": sender,
        "timestamp": msg.get("timestamp") or datetime.now().isoformat(),
        "document": document,
        "suppressAssistant": suppress_assistant,
    }

    # Ensure per-user conversation container exists
    user_convs = CONVERSATIONS.setdefault(uid, {})
    conv = user_convs.get(conv_id)
    if not conv:
        conv = {"id": conv_id, "title": "Conversation", "created_at": datetime.now().isoformat(), "messages": []}
        user_convs[conv_id] = conv

    conv["messages"].append(message_obj)

    if message_obj["sender"] == "user" and not message_obj["suppressAssistant"]:
        assistant_msg = {
            "id": str(uuid.uuid4()),
            "text": "Thanks, I received your message.",
            "sender": "assistant",
            "timestamp": datetime.now().isoformat(),
        }
        conv["messages"].append(assistant_msg)

    response = {
        "conversation_id": conv_id,
        "conversation": conv,
        "messages": conv["messages"],
    }
    return response

@app.get("/chat/conversations")
def get_conversations(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get user's conversations (in-memory per user)"""
    uid = current_user.get("uid")
    user_convs = CONVERSATIONS.get(uid, {})
    # Return without heavy messages list for sidebar
    result = []
    for c in user_convs.values():
        result.append({
            "id": c["id"],
            "title": c.get("title") or "Conversation",
            "created_at": c.get("created_at"),
            "updated_at": c.get("updated_at") or c.get("created_at"),
            "messages_count": len(c.get("messages", [])),
        })
    # Most recent first
    result.sort(key=lambda x: x.get("updated_at") or x.get("created_at"), reverse=True)
    return result

@app.post("/chat/conversations")
def create_conversation(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Create a new conversation for the current user (in-memory)."""
    uid = current_user.get("uid")
    conv_id = str(uuid.uuid4())
    conv = {"id": conv_id, "title": "New conversation", "created_at": datetime.now().isoformat(), "messages": []}
    CONVERSATIONS.setdefault(uid, {})[conv_id] = conv
    return conv

@app.get("/chat/conversations/{conv_id}")
def get_conversation(conv_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Return the user's conversation with messages."""
    uid = current_user.get("uid")
    conv = CONVERSATIONS.get(uid, {}).get(conv_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv

@app.delete("/chat/conversations/{conv_id}")
def delete_conversation(conv_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    uid = current_user.get("uid")
    convs = CONVERSATIONS.get(uid, {})
    existed = conv_id in convs
    if existed:
        del convs[conv_id]
    return {"ok": True, "deleted_id": conv_id}

@app.patch("/chat/conversations/{conv_id}")
def patch_conversation(conv_id: str, payload: dict = Body(...), current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    uid = current_user.get("uid")
    conv = CONVERSATIONS.get(uid, {}).get(conv_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if "title" in payload and payload["title"]:
        conv["title"] = payload["title"]
    if "starred" in payload:
        conv["starred"] = bool(payload["starred"])
    conv["updated_at"] = datetime.now().isoformat()
    return conv

def _doc_to_json(d: DocumentModel):
    return {
        "id": str(d.id),
        "filename": d.filename,
        "documentType": d.document_type,
        "uploadDate": (d.uploaded_at.isoformat() if getattr(d, "uploaded_at", None) else datetime.now().isoformat()),
        "fileSize": getattr(d, "file_size", 0),
        "user_id": d.user_id,
    }

@app.get("/documents")
def get_documents(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    uid = current_user.get("uid")
    docs = db.query(DocumentModel).filter(DocumentModel.user_id == uid).order_by(DocumentModel.uploaded_at.desc()).all()
    return [ _doc_to_json(d) for d in docs ]

@app.post("/documents/upload")
def upload_document(file: UploadFile = File(...), current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    uid = current_user.get("uid")
    os.makedirs("/tmp/medivise_docs", exist_ok=True)
    doc_id = str(uuid.uuid4())
    dest_path = f"/tmp/medivise_docs/{doc_id}_{file.filename}"
    with open(dest_path, "wb") as out:
        shutil.copyfileobj(file.file, out)
    size = os.path.getsize(dest_path)
    doc = DocumentModel(
        user_id=uid,
        filename=file.filename,
        original_name=file.filename,
        file_path=dest_path,
        file_size=size,
        content_preview="",
        full_content="",
        document_type=file.content_type or "application/pdf",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return {"document": _doc_to_json(doc)}

@app.get("/documents/{doc_id}")
def get_document_meta(doc_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    uid = current_user.get("uid")
    d = db.query(DocumentModel).filter(DocumentModel.id == doc_id, DocumentModel.user_id == uid).first()
    if not d:
        raise HTTPException(status_code=404, detail="Document not found")
    return _doc_to_json(d)

@app.get("/documents/{doc_id}/file")
def get_document_file(doc_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    uid = current_user.get("uid")
    d = db.query(DocumentModel).filter(DocumentModel.id == doc_id, DocumentModel.user_id == uid).first()
    if not d:
        raise HTTPException(status_code=404, detail="Document not found")
    return FileResponse(d.file_path, media_type=d.document_type, filename=d.filename)

@app.patch("/documents/{doc_id}")
def update_document(doc_id: str, update_data: dict, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    uid = current_user.get("uid")
    d = db.query(DocumentModel).filter(DocumentModel.id == doc_id, DocumentModel.user_id == uid).first()
    if not d:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if "filename" in update_data:
        d.filename = update_data["filename"]
        db.commit()
        db.refresh(d)
    
    return _doc_to_json(d)

@app.delete("/documents/{doc_id}")
def delete_document(doc_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    uid = current_user.get("uid")
    d = db.query(DocumentModel).filter(DocumentModel.id == doc_id, DocumentModel.user_id == uid).first()
    if not d:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Delete the file from disk
    try:
        if os.path.exists(d.file_path):
            os.remove(d.file_path)
    except Exception as e:
        print(f"Warning: Could not delete file {d.file_path}: {e}")
    
    # Delete from database
    db.delete(d)
    db.commit()
    
    return {"message": "Document deleted successfully"}

# User profile endpoints expected by frontend
@app.get("/users/me")
def get_user_profile(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    uid = current_user.get("uid")
    email = current_user.get("email")
    user = db.query(User).filter(User.firebase_uid == uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User profile not found")
    return {
        "user": {
            "id": user.id,
            "firebase_uid": user.firebase_uid,
            "username": user.username or "",
            "email": user.email or "",
            "first_name": user.first_name or "",
            "last_name": user.last_name or "",
        }
    }

class CreateUserPayload(BaseModel):
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None

@app.post("/users")
def create_or_update_user(payload: CreateUserPayload, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    uid = current_user.get("uid")
    email = current_user.get("email")

    # Username uniqueness check if provided
    if payload.username:
        taken = db.query(User).filter(User.username == payload.username).first()
        if taken and taken.firebase_uid != uid:
            raise HTTPException(status_code=409, detail="Username already taken")

    user = db.query(User).filter(User.firebase_uid == uid).first()
    if not user:
        user = User(firebase_uid=uid, email=email)
        db.add(user)

    # Update provided fields
    if payload.username is not None:
        user.username = payload.username
    if payload.first_name is not None:
        user.first_name = payload.first_name
    if payload.last_name is not None:
        user.last_name = payload.last_name

    db.commit()
    db.refresh(user)

    return {
        "user": {
            "id": user.id,
            "firebase_uid": user.firebase_uid,
            "username": user.username or "",
            "email": user.email or "",
            "first_name": user.first_name or "",
            "last_name": user.last_name or "",
        }
    }

@app.delete("/users/me")
def delete_user_profile(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    uid = current_user.get("uid")
    user = db.query(User).filter(User.firebase_uid == uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User profile not found")
    
    # Delete all user data (conversations, messages, documents, medications, appointments)
    # This ensures complete data cleanup when account is deleted
    
    # Delete conversations and their messages
    conversations = db.query(Conversation).filter(Conversation.user_id == uid).all()
    for conv in conversations:
        # Delete messages in this conversation
        db.query(MessageModel).filter(MessageModel.conversation_id == conv.id).delete()
        # Delete the conversation
        db.delete(conv)
    
    # Delete documents
    documents = db.query(DocumentModel).filter(DocumentModel.user_id == uid).all()
    for doc in documents:
        # Delete the file from disk
        try:
            if os.path.exists(doc.file_path):
                os.remove(doc.file_path)
        except Exception as e:
            print(f"Warning: Could not delete file {doc.file_path}: {e}")
        # Delete the document record
        db.delete(doc)
    
    # Delete medications
    db.query(Medication).filter(Medication.user_id == uid).delete()
    
    # Delete appointments
    db.query(Appointment).filter(Appointment.user_id == uid).delete()
    
    # Delete OCR documents
    db.query(OCRDocument).filter(OCRDocument.user_id == uid).delete()
    
    # Finally, delete the user profile
    db.delete(user)
    db.commit()
    
    return {"message": "User account and all associated data deleted successfully"}

@app.get("/public/check-username/{username}")
def check_username(username: str, db: Session = Depends(get_db)):
    exists = db.query(User).filter(User.username == username).first() is not None
    return {"available": not exists}

# LLM Integration Endpoints
class DocumentSummaryRequest(BaseModel):
    document_text: str

class MedicalQuestionRequest(BaseModel):
    document_text: str
    question: str

class ConversationalChatRequest(BaseModel):
    user_message: str
    context_document: Optional[str] = None
    conversation_history: List[Dict[str, str]] = []
    user_documents: List[Dict[str, str]] = []
    include_insights: bool = True
    conversational_mode: bool = True

@app.post("/ai/summarize")
async def summarize_medical_document(
    request: DocumentSummaryRequest, 
    current_user: dict = Depends(get_current_user)
):
    """
    Summarize a medical document using AI
    """
    try:
        result = await summarize_document(request.document_text)
        return {
            "success": True,
            "summary": result["summary"],
            "medications": result["medications"],
            "highlights": result["highlights"],
            "processed_at": result["processed_at"],
            "model_used": result["model_used"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to summarize document: {str(e)}")

@app.post("/ai/ask-question")
async def ask_medical_question(
    request: MedicalQuestionRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Ask a question about a medical document using AI
    """
    try:
        result = await answer_question(request.document_text, request.question)
        return {
            "success": True,
            "question": result["question"],
            "answer": result["answer"],
            "answered_at": result["answered_at"],
            "model_used": result["model_used"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to answer question: {str(e)}")

@app.post("/ai/summarize-document/{doc_id}")
async def summarize_document_by_id(
    doc_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Summarize a document by its ID using AI
    """
    uid = current_user.get("uid")
    
    # Get the document
    doc = db.query(DocumentModel).filter(
        DocumentModel.id == doc_id, 
        DocumentModel.user_id == uid
    ).first()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Get the document text (from OCR or direct content)
    document_text = doc.full_content or doc.content_preview or ""
    
    if not document_text.strip():
        raise HTTPException(status_code=400, detail="Document has no text content to summarize")
    
    try:
        result = await summarize_document(document_text)
        
        # Update the document with the summary
        doc.content_preview = result["summary"]
        db.commit()
        
        return {
            "success": True,
            "document_id": doc_id,
            "summary": result["summary"],
            "medications": result["medications"],
            "highlights": result["highlights"],
            "processed_at": result["processed_at"],
            "model_used": result["model_used"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to summarize document: {str(e)}")

@app.post("/ai/ask-document-question/{doc_id}")
async def ask_document_question(
    doc_id: str,
    question: str = Body(..., embed=True),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Ask a question about a specific document using AI
    """
    uid = current_user.get("uid")
    
    # Get the document
    doc = db.query(DocumentModel).filter(
        DocumentModel.id == doc_id, 
        DocumentModel.user_id == uid
    ).first()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Get the document text
    document_text = doc.full_content or doc.content_preview or ""
    
    if not document_text.strip():
        raise HTTPException(status_code=400, detail="Document has no text content")
    
    try:
        result = await answer_question(document_text, question)
        
        return {
            "success": True,
            "document_id": doc_id,
            "question": result["question"],
            "answer": result["answer"],
            "answered_at": result["answered_at"],
            "model_used": result["model_used"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to answer question: {str(e)}")

@app.post("/ai/chat")
async def conversational_medical_chat(
    request: ConversationalChatRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Enhanced conversational medical chat with context awareness
    """
    try:
        from .llm_service import MedicalLLMService
        
        async with MedicalLLMService() as service:
            # Build context from user documents and conversation history
            context_info = ""
            
            # Add user documents context
            if request.user_documents:
                context_info += "USER'S MEDICAL DOCUMENTS:\n"
                for doc in request.user_documents:
                    context_info += f"- {doc.get('filename', 'Unknown')}: {doc.get('summary', 'No summary available')}\n"
                context_info += "\n"
            
            # Add conversation history context
            if request.conversation_history:
                context_info += "RECENT CONVERSATION:\n"
                for msg in request.conversation_history[-6:]:  # Last 6 messages for context
                    role = msg.get('role', 'unknown')
                    content = msg.get('content', '')
                    context_info += f"{role.upper()}: {content}\n"
                context_info += "\n"
            
            # Create enhanced system prompt for conversational mode
            system_prompt = f"""You are MediVise, an advanced medical AI assistant with human-level conversational capabilities. You help patients understand their medical information in a warm, empathetic, and professional manner.

CONTEXT INFORMATION:
{context_info}

YOUR CAPABILITIES:
- Provide clear, empathetic explanations of medical information
- Answer questions about medications, conditions, and treatments
- Offer practical health insights and recommendations
- Maintain conversation flow and remember context
- Provide emotional support while being medically accurate

CONVERSATION STYLE:
- Be warm, supportive, and human-like
- Use "I understand" and "That makes sense" to show empathy
- Ask follow-up questions when appropriate
- Provide actionable advice and next steps
- Use simple language while maintaining medical accuracy

IMPORTANT GUIDELINES:
- Always remind users to consult healthcare providers for medical decisions
- Never provide diagnostic advice or replace professional medical care
- For urgent medical concerns, direct users to emergency services
- Be honest about limitations and encourage professional consultation
- Maintain patient privacy and confidentiality

Current user message: {request.user_message}

Respond as a caring, knowledgeable medical assistant who truly wants to help."""

            # Get the AI response
            response = await service._make_request(request.user_message, system_prompt)
            
            # Add medical insights if requested
            insights = ""
            if request.include_insights and request.user_documents:
                insights = "\n\n💡 **Medical Insights:**\n"
                insights += "- I can see you have medical documents uploaded. Would you like me to analyze any specific document?\n"
                insights += "- I can help explain medications, conditions, or treatment plans from your records.\n"
                insights += "- Feel free to ask me about any medical terms or instructions you don't understand.\n"
            
            return {
                "success": True,
                "response": response + insights,
                "conversation_id": None,  # Will be handled by frontend
                "timestamp": datetime.now().isoformat(),
                "model_used": service.model_name,
                "context_used": len(request.user_documents) > 0 or len(request.conversation_history) > 0
            }
            
    except Exception as e:
        logger.error(f"Error in conversational chat: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process chat request: {str(e)}")

# New Enhanced AI Endpoints

@app.post("/ai/summarize/document/{doc_id}", response_model=SummaryResponse)
async def summarize_document_by_id_enhanced(
    doc_id: str,
    request: SummaryRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Enhanced document summarization using map-reduce pattern with citations and risk assessment.
    """
    uid = current_user.get("uid")
    
    # Get the document
    doc = db.query(DocumentModel).filter(
        DocumentModel.id == doc_id, 
        DocumentModel.user_id == uid
    ).first()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Get the document text (from OCR or direct content)
    document_text = doc.full_content or doc.content_preview or ""
    
    if not document_text.strip():
        raise HTTPException(status_code=400, detail="Document has no text content to summarize")
    
    try:
        async with MedicalLLMService() as service:
            result = await service.summarize_text_map_reduce(
                text=document_text,
                style=request.style,
                doc_id=int(doc_id)
            )
            
            # Update the document with the summary preview
            if result.sections:
                preview_text = result.sections[0].title + ": " + "; ".join(result.sections[0].bullets[:2])
                doc.content_preview = preview_text[:500]  # Limit preview length
                db.commit()
            
            return result
            
    except Exception as e:
        logger.error(f"Error in enhanced document summarization: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to summarize document: {str(e)}")

@app.post("/ai/chat/enhanced", response_model=ChatResponse)
async def enhanced_conversational_chat(
    request: ConversationalChatRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Enhanced conversational chat with automatic document context injection.
    """
    try:
        uid = current_user.get("uid")
        
        # Get user's recent documents for context
        user_docs = db.query(DocumentModel).filter(
            DocumentModel.user_id == uid
        ).order_by(DocumentModel.uploaded_at.desc()).limit(5).all()
        
        # Convert to dict format for retrieval
        documents = []
        for doc in user_docs:
            if doc.full_content:
                documents.append({
                    'id': str(doc.id),
                    'filename': doc.filename,
                    'full_content': doc.full_content
                })
        
        # Extract keywords from conversation history
        keywords = extract_keywords_from_conversation(request.conversation_history)
        query = request.user_message + " " + " ".join(keywords)
        
        # Retrieve relevant snippets
        snippets = extract_snippets_by_document(documents, query, max_snippets_per_doc=2)
        
        async with MedicalLLMService() as service:
            if snippets:
                # Use RAG with document context
                result = await service.rag_answer(request.user_message, snippets)
            else:
                # Fallback to general conversation
                system_prompt = f"""You are MediVise, an advanced medical AI assistant. Help the user with their medical questions in a warm, professional manner.

CONVERSATION HISTORY:
{chr(10).join([f"{msg.get('role', 'unknown')}: {msg.get('content', '')}" for msg in request.conversation_history[-4:]])}

USER MESSAGE: {request.user_message}

Provide a helpful response. If you need specific medical information, suggest they upload relevant documents."""
                
                answer = await service._make_request(request.user_message, system_prompt)
                result = ChatResponse(
                    answer=answer,
                    citations=[],
                    context_used=False,
                    model_used=service.model_name,
                    timestamp=datetime.now().isoformat()
                )
            
            return result
            
    except Exception as e:
        logger.error(f"Error in enhanced chat: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process chat request: {str(e)}")

@app.post("/ai/ask-document-question/{doc_id}", response_model=ChatResponse)
async def ask_document_question_enhanced(
    doc_id: str,
    question: str = Body(..., embed=True),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Enhanced document Q&A with snippet retrieval and citations.
    """
    uid = current_user.get("uid")
    
    # Get the document
    doc = db.query(DocumentModel).filter(
        DocumentModel.id == doc_id, 
        DocumentModel.user_id == uid
    ).first()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Get the document text
    document_text = doc.full_content or doc.content_preview or ""
    
    if not document_text.strip():
        raise HTTPException(status_code=400, detail="Document has no text content")
    
    try:
        # Extract relevant snippets from the document
        from .retrieval import extract_snippets
        snippets = extract_snippets(document_text, question, max_snippets=6)
        
        # Add document context to citations
        for snippet in snippets:
            snippet.citation = f"doc:{doc_id} {snippet.citation}"
        
        async with MedicalLLMService() as service:
            result = await service.rag_answer(question, snippets)
            return result
            
    except Exception as e:
        logger.error(f"Error in enhanced document Q&A: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to answer question: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
