from typing import Optional
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Text, Integer, Boolean, DateTime, ForeignKey, func, Enum
from app.models import Base
import enum

class AppointmentStatusEnum(str, enum.Enum):
    scheduled = "scheduled"
    confirmed = "confirmed"
    completed = "completed"
    cancelled = "cancelled"
    no_show = "no_show"
    rescheduled = "rescheduled"

class AppointmentTypeEnum(str, enum.Enum):
    consultation = "consultation"
    follow_up = "follow_up"
    checkup = "checkup"
    procedure = "procedure"
    emergency = "emergency"
    therapy = "therapy"
    other = "other"

class Appointment(Base):
    __tablename__ = "appointments"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)

    # Basic appointment info
    title: Mapped[str] = mapped_column(String(256))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    appointment_type: Mapped[Optional[AppointmentTypeEnum]] = mapped_column(Enum(AppointmentTypeEnum), nullable=True)
    status: Mapped[AppointmentStatusEnum] = mapped_column(Enum(AppointmentStatusEnum), default=AppointmentStatusEnum.scheduled, server_default="scheduled")

    # Date and time
    scheduled_date: Mapped[DateTime] = mapped_column(DateTime(timezone=True))
    duration_minutes: Mapped[int] = mapped_column(Integer, default=30, server_default="30")
    end_time: Mapped[Optional[DateTime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Location and contact
    location: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    is_virtual: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    meeting_link: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

    # Healthcare provider info
    provider_name: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    provider_specialty: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    provider_phone: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    provider_email: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)

    # Preparation and notes
    preparation_instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    symptoms: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    questions_for_provider: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Reminders and notifications
    reminder_enabled: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    reminder_minutes_before: Mapped[int] = mapped_column(Integer, default=60, server_default="60")
    email_reminder: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    sms_reminder: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")

    # Related records
    related_medication_ids: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON string of medication IDs
    related_document_ids: Mapped[Optional[str]] = mapped_column(Text, nullable=True)    # JSON string of document IDs
    follow_up_required: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    follow_up_date: Mapped[Optional[DateTime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Cost and insurance
    estimated_cost: Mapped[Optional[float]] = mapped_column(nullable=True)
    insurance_covered: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    copay_amount: Mapped[Optional[float]] = mapped_column(nullable=True)

    # Timestamps
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
