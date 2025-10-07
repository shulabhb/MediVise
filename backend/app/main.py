from fastapi import FastAPI, HTTPException, Depends, UploadFile, File
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
import os
import uuid
import shutil
from datetime import datetime
import json
from .auth import get_current_user
from .database import get_db, create_tables, engine
from sqlalchemy import text
from .models import User, Conversation, Message as MessageModel
from .models_ocr import DocumentPage

app = FastAPI(title="MediVise API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include OCR router
from .routers_ocr import router as ocr_router
app.include_router(ocr_router)

# Include Medications router
from .routers.medications import router as medications_router
app.include_router(medications_router)

@app.on_event("startup")
def startup_event():
    try:
        create_tables()
        print("Database tables created successfully")
        # Ensure optional columns exist without full migrations for Postgres only
        db_url = os.getenv("DATABASE_URL", "")
        if db_url.startswith("postgresql://") or db_url.startswith("postgresql+asyncpg://"):
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS starred BOOLEAN DEFAULT FALSE"))
                conn.commit()
    except Exception as e:
        print(f"Database connection failed: {e}")
        # Continue to allow health endpoint, but most DB routes will fail

class UserCreate(BaseModel):
    username: str
    email: str
    first_name: str
    last_name: str
    date_of_birth: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[str] = None

class SOSAlert(BaseModel):
    emergency_type: str
    message: Optional[str] = None

class Message(BaseModel):
    id: str
    text: str
    sender: str
    timestamp: datetime
    document: Optional[dict] = None

class ConversationDTO(BaseModel):
    id: str
    title: str
    lastMessage: str
    timestamp: datetime
    messages: List[Message]
    userId: str

class DocumentUpload(BaseModel):
    filename: str
    content: str
    documentType: str

class DocumentUpdate(BaseModel):
    filename: Optional[str] = None

class ChatMessage(BaseModel):
    message: str
    conversationId: Optional[str] = None
    document: Optional[DocumentUpload] = None
    sender: Optional[str] = None  # 'user' or 'assistant'
    suppressAssistant: Optional[bool] = False

class ConversationUpdate(BaseModel):
    title: Optional[str] = None
    starred: Optional[bool] = None

@app.get("/health")
def read_health():
    return {"status": "ok"}

@app.get("/me")
def read_me(user = Depends(get_current_user)):
    return {"user": user}

def _get_or_create_user(db: Session, firebase_uid: str, email: str, username: str) -> User:
    user = db.query(User).filter(User.firebase_uid == firebase_uid).first()
    if user:
        return user
    user = User(firebase_uid=firebase_uid, email=email, username=username)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.post("/users")
async def create_user(user_data: UserCreate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Create or update user profile"""
    user_id = current_user.get("uid")
    # unique username check
    if db.query(User).filter(User.username == user_data.username, User.firebase_uid != user_id).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    user = db.query(User).filter(User.firebase_uid == user_id).first()
    if not user:
        user = User(
            firebase_uid=user_id,
            username=user_data.username,
            email=user_data.email,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            date_of_birth=user_data.date_of_birth,
        )
        db.add(user)
    else:
        user.username = user_data.username
        user.email = user_data.email
        user.first_name = user_data.first_name
        user.last_name = user_data.last_name
        user.date_of_birth = user_data.date_of_birth
    db.commit()
    db.refresh(user)
    return {"message": "User profile upserted", "user": {
        "uid": user.firebase_uid,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "date_of_birth": user.date_of_birth,
    }}

@app.get("/users/me")
async def get_user_profile(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current user's profile"""
    user_id = current_user.get("uid")
    user = db.query(User).filter(User.firebase_uid == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User profile not found")
    return {"user": {
        "uid": user.firebase_uid,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "date_of_birth": user.date_of_birth,
    }}

@app.put("/users/me")
async def update_user_profile(user_data: UserUpdate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Update current user's profile"""
    user_id = current_user.get("uid")
    user = db.query(User).filter(User.firebase_uid == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User profile not found")
    if user_data.username and db.query(User).filter(User.username == user_data.username, User.firebase_uid != user_id).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    for field, value in user_data.dict(exclude_unset=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return {"message": "User profile updated successfully", "user": {
        "uid": user.firebase_uid,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "date_of_birth": user.date_of_birth,
    }}

@app.delete("/users/me")
async def delete_user_profile(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Delete current user's profile"""
    user_id = current_user.get("uid")
    user = db.query(User).filter(User.firebase_uid == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User profile not found")
    db.delete(user)
    db.commit()
    return {"message": "User profile deleted successfully"}

@app.get("/users/check-username/{username}")
async def check_username_availability(username: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Check if username is available"""
    user_id = current_user.get("uid")
    exists = db.query(User).filter(User.username == username, User.firebase_uid != user_id).first()
    if exists:
        return {"available": False, "message": "Username already taken"}
    return {"available": True, "message": "Username is available"}

# Public (unauthenticated) username availability check for signup preflight
@app.get("/public/check-username/{username}")
async def public_check_username_availability(username: str, db: Session = Depends(get_db)):
    """Check if a username is available without authentication (for signup forms)."""
    exists = db.query(User).filter(User.username == username).first()
    if exists:
        return {"available": False, "message": "Username already taken"}
    return {"available": True, "message": "Username is available"}

@app.get("/public/resolve-username/{username}")
async def public_resolve_username(username: str, db: Session = Depends(get_db)):
    """Resolve a username to the corresponding email for username-based login."""
    user = db.query(User).filter(User.username == username).first()
    if user:
        return {"email": user.email or ""}
    raise HTTPException(status_code=404, detail="Username not found")

# documents_db = {}  # Replaced with database storage

@app.post("/chat/conversations")
async def create_conversation(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Create a new conversation"""
    user_id = current_user.get("uid")
    user = _get_or_create_user(db, user_id, current_user.get("email", ""), current_user.get("email", "") or user_id)
    conv = Conversation(title="New Conversation", last_message="", user_id=user.id)
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return {
        "id": str(conv.id),
        "title": conv.title,
        "lastMessage": conv.last_message or "",
        "timestamp": conv.updated_at,
        "messages": [],
        "userId": user_id,
        "starred": bool(getattr(conv, 'starred', False)),
    }

@app.get("/chat/conversations")
async def get_conversations(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get user's conversations"""
    user_id = current_user.get("uid")
    user = _get_or_create_user(db, user_id, current_user.get("email", ""), current_user.get("email", "") or user_id)
    convs = (
        db.query(Conversation)
        .filter(Conversation.user_id == user.id)
        .order_by(Conversation.updated_at.desc())
        .all()
    )
    result = []
    for c in convs:
        result.append({
            "id": str(c.id),
            "title": c.title,
            "lastMessage": c.last_message or "",
            "timestamp": c.updated_at,
            "messages": [],
            "userId": user_id,
            "starred": bool(getattr(c, 'starred', False)),
        })
    return result

@app.get("/chat/conversations/{conversation_id}")
async def get_conversation(conversation_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get a specific conversation"""
    user_id = current_user.get("uid")
    user = db.query(User).filter(User.firebase_uid == user_id).first()
    conv = db.query(Conversation).filter(Conversation.id == int(conversation_id)).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if not user or conv.user_id != user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    msgs = (
        db.query(MessageModel)
        .filter(MessageModel.conversation_id == conv.id)
        .order_by(MessageModel.created_at.asc())
        .all()
    )
    return {
        "id": str(conv.id),
        "title": conv.title,
        "lastMessage": conv.last_message or "",
        "timestamp": conv.updated_at,
        "messages": [
            {
                "id": str(m.id),
                "text": m.text,
                "sender": m.sender,
                "timestamp": m.created_at,
                "document": m.document_data,
            } for m in msgs
        ],
        "userId": user_id,
        "starred": bool(getattr(conv, 'starred', False)),
    }

@app.post("/chat/message")
async def send_chat_message(chat_message: ChatMessage, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Send a chat message"""
    user_id = current_user.get("uid")
    user = _get_or_create_user(db, user_id, current_user.get("email", ""), current_user.get("email", "") or user_id)

    # Ensure conversation exists
    conv: Conversation
    if chat_message.conversationId:
        conv = db.query(Conversation).filter(Conversation.id == int(chat_message.conversationId)).first()
        if not conv or conv.user_id != user.id:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        conv = Conversation(title="New Conversation", last_message="", user_id=user.id)
        db.add(conv)
        db.commit()
        db.refresh(conv)

    # Add message with provided sender (default to user)
    msg_sender = (chat_message.sender or "user").lower()
    if msg_sender not in ("user", "assistant"):
        raise HTTPException(status_code=400, detail="Invalid sender")
    db_msg = MessageModel(
        text=chat_message.message,
        sender=msg_sender,
        conversation_id=conv.id,
        document_data=chat_message.document.dict() if chat_message.document else None,
    )
    db.add(db_msg)

    # Only add simulated assistant reply for true user messages when not suppressed
    if msg_sender == "user" and not chat_message.suppressAssistant:
        ai_msg = MessageModel(
            text="I'm here to help! This is a simulated response. In a real implementation, this would connect to your AI service.",
            sender="assistant",
            conversation_id=conv.id,
        )
        db.add(ai_msg)

    # Update conversation
    conv.last_message = chat_message.message
    db.commit()

    # Load messages for return
    msgs = (
        db.query(MessageModel)
        .filter(MessageModel.conversation_id == conv.id)
        .order_by(MessageModel.created_at.asc())
        .all()
    )
    return {
        "conversation": {
            "id": str(conv.id),
            "title": conv.title,
            "lastMessage": conv.last_message or "",
            "timestamp": conv.updated_at,
            "messages": [
                {
                    "id": str(m.id),
                    "text": m.text,
                    "sender": m.sender,
                    "timestamp": m.created_at,
                    "document": m.document_data,
                } for m in msgs
            ],
            "userId": user_id,
            "starred": bool(getattr(conv, 'starred', False)),
        },
        "message": "Message sent successfully",
    }

@app.patch("/chat/conversations/{conversation_id}")
async def update_conversation(conversation_id: str, payload: ConversationUpdate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = current_user.get("uid")
    user = db.query(User).filter(User.firebase_uid == user_id).first()
    conv = db.query(Conversation).filter(Conversation.id == int(conversation_id)).first()
    if not conv or not user or conv.user_id != user.id:
        raise HTTPException(status_code=404, detail="Conversation not found")
    changed = False
    if payload.title is not None:
        conv.title = payload.title
        changed = True
    if payload.starred is not None:
        setattr(conv, 'starred', bool(payload.starred))
        changed = True
    if changed:
        db.commit()
        db.refresh(conv)
    return {"ok": True}

@app.delete("/chat/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = current_user.get("uid")
    user = db.query(User).filter(User.firebase_uid == user_id).first()
    conv = db.query(Conversation).filter(Conversation.id == int(conversation_id)).first()
    if not conv or not user or conv.user_id != user.id:
        raise HTTPException(status_code=404, detail="Conversation not found")
    # delete messages first
    db.query(MessageModel).filter(MessageModel.conversation_id == conv.id).delete()
    db.delete(conv)
    db.commit()
    return {"ok": True}

@app.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload and parse a document"""
    user_id = current_user.get("uid")
    user = _get_or_create_user(db, user_id, current_user.get("email", ""), current_user.get("email", "") or user_id)

    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    # Create uploads directory if it doesn't exist
    upload_dir = "uploads"
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir)

    # Generate unique filename
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{user_id}_{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(upload_dir, unique_filename)

    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Parse PDF content
    try:
        import PyPDF2

        with open(file_path, 'rb') as pdf_file:
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            text_content = ""

            for page in pdf_reader.pages:
                text_content += page.extract_text() + "\n"

            # Store document info in database using OCR Document model
            from .models_ocr import Document as OCRDocument
            doc = OCRDocument(
                filename=file.filename,
                mime_type="application/pdf",
                storage_path=file_path,
                language_used="eng",
                ocr_engine="pypdf2",
                status="completed",
                num_pages=len(pdf_reader.pages),
                processing_ms=0,
                full_text=text_content,
            )
            db.add(doc)
            db.commit()
            db.refresh(doc)

            document_info = {
                "id": str(doc.id),
                "filename": doc.filename,
                "originalName": doc.filename,
                "filePath": doc.storage_path,
                "fileSize": os.path.getsize(file_path),
                "content": text_content[:1000],  # First 1000 chars for preview
                "fullContent": text_content,
                "documentType": "pdf",
                "uploadDate": doc.created_at.isoformat() if doc.created_at else datetime.now().isoformat(),
                "userId": user_id
            }

            return {
                "message": "Document uploaded and parsed successfully",
                "document": document_info
            }

    except Exception as e:
        # Clean up file if parsing fails
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Error parsing PDF: {str(e)}")

@app.get("/documents")
async def get_documents(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get user's uploaded documents"""
    user_id = current_user.get("uid")
    user = _get_or_create_user(db, user_id, current_user.get("email", ""), current_user.get("email", "") or user_id)
    
    from .models_ocr import Document as OCRDocument
    docs = db.query(OCRDocument).filter(OCRDocument.status == "completed").all()
    
    user_documents = []
    for doc in docs:
        user_documents.append({
            "id": str(doc.id),
            "filename": doc.filename,
            "originalName": doc.filename,
            "filePath": doc.storage_path,
            "fileSize": os.path.getsize(doc.storage_path) if os.path.exists(doc.storage_path) else 0,
            "content": doc.full_text[:1000] if doc.full_text else "",
            "fullContent": doc.full_text or "",
            "documentType": "pdf",
            "uploadDate": doc.created_at.isoformat() if doc.created_at else datetime.now().isoformat(),
            "userId": user_id
        })
    
    return user_documents

@app.get("/documents/{document_id}")
async def get_document(document_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get a specific document"""
    user_id = current_user.get("uid")
    user = _get_or_create_user(db, user_id, current_user.get("email", ""), current_user.get("email", "") or user_id)
    
    from .models_ocr import Document as OCRDocument
    doc = db.query(OCRDocument).filter(OCRDocument.id == int(document_id)).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    return {
        "id": str(doc.id),
        "filename": doc.filename,
        "originalName": doc.filename,
        "filePath": doc.storage_path,
        "fileSize": os.path.getsize(doc.storage_path) if os.path.exists(doc.storage_path) else 0,
        "content": doc.full_text[:1000] if doc.full_text else "",
        "fullContent": doc.full_text or "",
        "documentType": "pdf",
        "uploadDate": doc.created_at.isoformat() if doc.created_at else datetime.now().isoformat(),
        "userId": user_id
    }

@app.get("/documents/{document_id}/file")
async def get_document_file(document_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Stream the original PDF file for the given document id."""
    user_id = current_user.get("uid")
    user = _get_or_create_user(db, user_id, current_user.get("email", ""), current_user.get("email", "") or user_id)
    
    from .models_ocr import Document as OCRDocument
    doc = db.query(OCRDocument).filter(OCRDocument.id == int(document_id)).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    file_path = doc.storage_path
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path=file_path, media_type="application/pdf", filename=doc.filename or "document.pdf")

@app.patch("/documents/{document_id}")
async def update_document(document_id: str, payload: DocumentUpdate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Rename or update document metadata."""
    user_id = current_user.get("uid")
    user = _get_or_create_user(db, user_id, current_user.get("email", ""), current_user.get("email", "") or user_id)
    
    from .models_ocr import Document as OCRDocument
    doc = db.query(OCRDocument).filter(OCRDocument.id == int(document_id)).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    changed = False
    if payload.filename is not None and payload.filename.strip():
        doc.filename = payload.filename.strip()
        changed = True
    
    if changed:
        db.commit()
        db.refresh(doc)
    
    return {"ok": True, "document": {
        "id": str(doc.id),
        "filename": doc.filename,
        "originalName": doc.filename,
        "filePath": doc.storage_path,
        "fileSize": os.path.getsize(doc.storage_path) if os.path.exists(doc.storage_path) else 0,
        "content": doc.full_text[:1000] if doc.full_text else "",
        "fullContent": doc.full_text or "",
        "documentType": "pdf",
        "uploadDate": doc.created_at.isoformat() if doc.created_at else datetime.now().isoformat(),
        "userId": user_id
    }}

@app.delete("/documents/{document_id}")
async def delete_document(document_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Delete a document and its file."""
    user_id = current_user.get("uid")
    user = _get_or_create_user(db, user_id, current_user.get("email", ""), current_user.get("email", "") or user_id)
    
    from .models_ocr import Document as OCRDocument
    doc = db.query(OCRDocument).filter(OCRDocument.id == int(document_id)).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Remove file if it exists
    file_path = doc.storage_path
    if file_path and os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception:
            pass  # Continue even if file deletion fails
    
    # Remove from database
    db.delete(doc)
    db.commit()
    return {"ok": True}

@app.post("/sos-alert")
async def send_sos_alert(alert_data: SOSAlert, current_user: dict = Depends(get_current_user)):
    """Send SOS emergency alert"""
    user_id = current_user.get("uid")
    user_email = current_user.get("email", "Unknown")

    # In a real application, this would send actual notifications
    # For now, we'll just log the alert
    print(f"SOS ALERT from user {user_id} ({user_email}):")
    print(f"Emergency Type: {alert_data.emergency_type}")
    print(f"Message: {alert_data.message}")

    # Simulate sending email notification
    alert_message = f"""
    SOS EMERGENCY ALERT

    User: {user_email} (ID: {user_id})
    Emergency Type: {alert_data.emergency_type}
    Message: {alert_data.message or 'No additional message'}
    Timestamp: {__import__('datetime').datetime.now().isoformat()}

    Please respond immediately!
    """

    print("Email notification would be sent:")
    print(alert_message)

    return {
        "message": "SOS alert sent successfully",
        "alert_id": f"sos_{user_id}_{__import__('time').time()}",
        "timestamp": __import__('datetime').datetime.now().isoformat()
    }
