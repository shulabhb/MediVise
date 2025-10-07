from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal
from datetime import date

DoseForm = Literal["tablet","capsule","liquid","patch","injection","inhaler","other"]
Route = Literal["po","sl","iv","im","topical","inh","other"]

class MedicationBase(BaseModel):
    user_id: Optional[str] = None
    name: str = Field(..., min_length=1, max_length=256)
    generic_name: Optional[str] = None

    dose_strength: str = Field(..., max_length=64)
    dose_form: Optional[DoseForm] = None
    route: Optional[Route] = None

    frequency: str = Field(..., max_length=128)
    directions: Optional[str] = None
    indication: Optional[str] = None

    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: Optional[bool] = True

    prescribing_provider: Optional[str] = None
    pharmacy: Optional[str] = None
    ndc_code: Optional[str] = None

    refills_remaining: Optional[int] = 0
    total_refills: Optional[int] = 0
    last_filled_date: Optional[date] = None

    notes: Optional[str] = None
    source_document_id: Optional[int] = None
    reminder_enabled: Optional[bool] = False

    @field_validator("refills_remaining","total_refills")
    @classmethod
    def non_negative(cls, v):
        if v is not None and v < 0:
            raise ValueError("Refills cannot be negative")
        return v

class MedicationCreate(MedicationBase):
    pass

class MedicationUpdate(BaseModel):
    # all optional for PATCH
    user_id: Optional[str] = None
    name: Optional[str] = None
    generic_name: Optional[str] = None
    dose_strength: Optional[str] = None
    dose_form: Optional[DoseForm] = None
    route: Optional[Route] = None
    frequency: Optional[str] = None
    directions: Optional[str] = None
    indication: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: Optional[bool] = None
    prescribing_provider: Optional[str] = None
    pharmacy: Optional[str] = None
    ndc_code: Optional[str] = None
    refills_remaining: Optional[int] = None
    total_refills: Optional[int] = None
    last_filled_date: Optional[date] = None
    notes: Optional[str] = None
    source_document_id: Optional[int] = None
    reminder_enabled: Optional[bool] = None

class MedicationOut(MedicationBase):
    id: int
    class Config:
        from_attributes = True
