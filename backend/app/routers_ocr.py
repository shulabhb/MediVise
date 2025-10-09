import os, uuid, mimetypes
from fastapi import APIRouter, UploadFile, File, HTTPException, Query, Depends
from sqlalchemy.orm import Session
from .database import SessionLocal
from .auth import get_current_user
from .models_ocr import DocumentPage, OCRDocument
from .ocr_service import ocr_pages_from_bytes, ALLOWED_MIME
from .models import Base
from sqlalchemy import Column, Integer, String, Text


router = APIRouter(prefix="/api/ocr", tags=["ocr"])

OCR_UPLOAD_DIR = os.getenv("OCR_UPLOAD_DIR", "./uploads")
os.makedirs(OCR_UPLOAD_DIR, exist_ok=True)


# Use Document model from app.models to avoid duplicate table definitions


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/ingest")
def ingest_ocr(file: UploadFile = File(...), lang: str = Query("eng"), current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = current_user.get("uid")
    mime_type = file.content_type or mimetypes.guess_type(file.filename or "")[0] or "application/octet-stream"
    fn_lower = (file.filename or "").lower()
    if mime_type not in ALLOWED_MIME and not fn_lower.endswith((".pdf", ".png", ".jpg", ".jpeg", ".tif", ".tiff")):
        raise HTTPException(status_code=415, detail=f"Unsupported file type: {mime_type}")

    data = file.file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")

    uid = str(uuid.uuid4())
    ext = (os.path.splitext(file.filename or "")[1] or ".bin").lower()
    local_path = os.path.join(OCR_UPLOAD_DIR, f"{uid}{ext}")
    with open(local_path, "wb") as f:
        f.write(data)

    try:
        pages, full_text, processing_ms = ocr_pages_from_bytes(data, mime_type, lang=lang)
    except Exception as e:
        # Persist failed document record for audit/debugging
        doc = OCRDocument(
            user_id=user_id,  # Add user isolation
            filename=file.filename or f"upload{ext}",
            mime_type=mime_type,
            storage_path=local_path,
            language_used=lang,
            ocr_engine="tesseract",
            status="failed",
            num_pages=0,
            processing_ms=0,
            full_text="",
        )
        db.add(doc)
        db.commit()
        # Return a proper error response so frontend can surface it
        raise HTTPException(status_code=500, detail=f"OCR failed: {str(e)}")

    doc = OCRDocument(
        user_id=user_id,  # Add user isolation
        filename=file.filename or f"upload{ext}",
        mime_type=mime_type,
        storage_path=local_path,
        language_used=lang,
        ocr_engine="tesseract",
        status="completed",
        num_pages=len(pages),
        processing_ms=processing_ms,
        full_text=full_text,
    )
    db.add(doc)
    db.flush()

    rows = [
        DocumentPage(document_id=doc.id, page_number=p["page_number"], text=p["text"], mean_confidence=p["mean_confidence"]) for p in pages
    ]
    db.add_all(rows)
    db.commit()

    return {
        "document_id": doc.id,
        "filename": doc.filename,
        "mime_type": doc.mime_type,
        "num_pages": doc.num_pages,
        "language_used": doc.language_used,
        "processing_ms": doc.processing_ms,
        "pages": pages,
        "full_text": full_text,
        "status": doc.status,
    }


