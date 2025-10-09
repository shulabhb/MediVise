from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal
from datetime import datetime

AppointmentStatus = Literal["scheduled","confirmed","completed","cancelled","no_show","rescheduled"]
AppointmentType = Literal["consultation","follow_up","checkup","procedure","emergency","therapy","other"]

class AppointmentBase(BaseModel):
    user_id: Optional[str] = None
    title: str = Field(..., min_length=1, max_length=256)
    description: Optional[str] = None
    appointment_type: Optional[AppointmentType] = None
    status: Optional[AppointmentStatus] = "scheduled"

    # Date and time
    scheduled_date: datetime = Field(...)
    duration_minutes: Optional[int] = 30
    end_time: Optional[datetime] = None

    # Location and contact
    location: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    is_virtual: Optional[bool] = False
    meeting_link: Optional[str] = None

    # Healthcare provider info
    provider_name: Optional[str] = None
    provider_specialty: Optional[str] = None
    provider_phone: Optional[str] = None
    provider_email: Optional[str] = None

    # Preparation and notes
    preparation_instructions: Optional[str] = None
    notes: Optional[str] = None
    symptoms: Optional[str] = None
    questions_for_provider: Optional[str] = None

    # Reminders and notifications
    reminder_enabled: Optional[bool] = True
    reminder_minutes_before: Optional[int] = 60
    email_reminder: Optional[bool] = True
    sms_reminder: Optional[bool] = False

    # Related records
    related_medication_ids: Optional[str] = None  # JSON string
    related_document_ids: Optional[str] = None    # JSON string
    follow_up_required: Optional[bool] = False
    follow_up_date: Optional[datetime] = None

    # Cost and insurance
    estimated_cost: Optional[float] = None
    insurance_covered: Optional[bool] = None
    copay_amount: Optional[float] = None

    @field_validator("duration_minutes", "reminder_minutes_before")
    @classmethod
    def positive_integers(cls, v):
        if v is not None and v <= 0:
            raise ValueError("Must be a positive integer")
        return v

    @field_validator("estimated_cost", "copay_amount")
    @classmethod
    def non_negative_floats(cls, v):
        if v is not None and v < 0:
            raise ValueError("Cannot be negative")
        return v

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentUpdate(BaseModel):
    # all optional for PATCH
    user_id: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    appointment_type: Optional[AppointmentType] = None
    status: Optional[AppointmentStatus] = None

    # Date and time
    scheduled_date: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    end_time: Optional[datetime] = None

    # Location and contact
    location: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    is_virtual: Optional[bool] = None
    meeting_link: Optional[str] = None

    # Healthcare provider info
    provider_name: Optional[str] = None
    provider_specialty: Optional[str] = None
    provider_phone: Optional[str] = None
    provider_email: Optional[str] = None

    # Preparation and notes
    preparation_instructions: Optional[str] = None
    notes: Optional[str] = None
    symptoms: Optional[str] = None
    questions_for_provider: Optional[str] = None

    # Reminders and notifications
    reminder_enabled: Optional[bool] = None
    reminder_minutes_before: Optional[int] = None
    email_reminder: Optional[bool] = None
    sms_reminder: Optional[bool] = None

    # Related records
    related_medication_ids: Optional[str] = None
    related_document_ids: Optional[str] = None
    follow_up_required: Optional[bool] = None
    follow_up_date: Optional[datetime] = None

    # Cost and insurance
    estimated_cost: Optional[float] = None
    insurance_covered: Optional[bool] = None
    copay_amount: Optional[float] = None

class AppointmentOut(AppointmentBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
