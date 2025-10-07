from typing import Optional
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Text, Integer, Boolean, Date, ForeignKey, DateTime, func, Enum
from app.models import Base
import enum

class DoseFormEnum(str, enum.Enum):
    tablet = "tablet"
    capsule = "capsule"
    liquid = "liquid"
    patch = "patch"
    injection = "injection"
    inhaler = "inhaler"
    other = "other"

class RouteEnum(str, enum.Enum):
    po = "po"
    sl = "sl"
    iv = "iv"
    im = "im"
    topical = "topical"
    inh = "inh"
    other = "other"

class Medication(Base):
    __tablename__ = "medications"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)

    name: Mapped[str] = mapped_column(String(256))
    generic_name: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)

    dose_strength: Mapped[str] = mapped_column(String(64))
    dose_form: Mapped[Optional[DoseFormEnum]] = mapped_column(Enum(DoseFormEnum), nullable=True)
    route: Mapped[Optional[RouteEnum]] = mapped_column(Enum(RouteEnum), nullable=True)

    frequency: Mapped[str] = mapped_column(String(128))
    directions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    indication: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)

    start_date: Mapped[Optional[Date]] = mapped_column(Date, nullable=True)
    end_date: Mapped[Optional[Date]] = mapped_column(Date, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    prescribing_provider: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    pharmacy: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    ndc_code: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    refills_remaining: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    total_refills: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    last_filled_date: Mapped[Optional[Date]] = mapped_column(Date, nullable=True)

    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source_document_id: Mapped[Optional[int]] = mapped_column(ForeignKey("documents.id"), nullable=True)

    reminder_enabled: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")

    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
