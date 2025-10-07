from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Text, Integer, ForeignKey, Float, DateTime
from sqlalchemy.sql import func
from .models import Base


class DocumentPage(Base):
    __tablename__ = "ocr_document_pages"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("ocr_documents.id", ondelete="CASCADE"))
    page_number: Mapped[int] = mapped_column(Integer)
    text: Mapped[str] = mapped_column(Text)
    mean_confidence: Mapped[float] = mapped_column(Float, default=0.0)



# OCR-specific Document model (separate from app.models.Document)
class Document(Base):
    __tablename__ = "ocr_documents"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    filename: Mapped[str] = mapped_column(String(512))
    mime_type: Mapped[str] = mapped_column(String(128))
    storage_path: Mapped[str] = mapped_column(String(1024))
    language_used: Mapped[str] = mapped_column(String(64), default="eng")
    ocr_engine: Mapped[str] = mapped_column(String(64), default="tesseract")
    status: Mapped[str] = mapped_column(String(32), default="completed")
    num_pages: Mapped[int] = mapped_column(Integer, default=0)
    processing_ms: Mapped[int] = mapped_column(Integer, default=0)
    full_text: Mapped[str] = mapped_column(Text)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

