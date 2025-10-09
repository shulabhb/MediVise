from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.auth import get_current_user
from app.models_medication import Medication
from app.schemas_medication import MedicationCreate, MedicationUpdate, MedicationOut

router = APIRouter(prefix="/api/medications", tags=["medications"])

@router.get("", response_model=List[MedicationOut])
def list_medications(
    is_active: Optional[bool] = Query(None),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get user's medications with optional filtering"""
    user_id = current_user.get("uid")
    q = db.query(Medication).filter(Medication.user_id == user_id)
    if is_active is not None:
        q = q.filter(Medication.is_active == is_active)
    return q.order_by(Medication.is_active.desc(), Medication.name.asc()).all()

@router.post("", response_model=MedicationOut)
def create_medication(
    payload: MedicationCreate, 
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new medication for the current user"""
    user_id = current_user.get("uid")
    med_data = payload.model_dump(exclude_unset=True)
    med_data["user_id"] = user_id  # Ensure user_id is set
    med = Medication(**med_data)
    db.add(med)
    db.commit()
    db.refresh(med)
    return med

@router.patch("/{med_id}", response_model=MedicationOut)
def update_medication(
    med_id: int, 
    payload: MedicationUpdate, 
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a medication (only if it belongs to the current user)"""
    user_id = current_user.get("uid")
    med = db.query(Medication).filter(
        Medication.id == med_id,
        Medication.user_id == user_id
    ).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(med, k, v)
    db.commit()
    db.refresh(med)
    return med

@router.delete("/{med_id}")
def delete_medication(
    med_id: int, 
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a medication (only if it belongs to the current user)"""
    user_id = current_user.get("uid")
    med = db.query(Medication).filter(
        Medication.id == med_id,
        Medication.user_id == user_id
    ).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
    db.delete(med)
    db.commit()
    return {"ok": True, "deleted_id": med_id}
