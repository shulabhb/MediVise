from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models_medication import Medication
from app.schemas_medication import MedicationCreate, MedicationUpdate, MedicationOut

router = APIRouter(prefix="/api/medications", tags=["medications"])

@router.get("", response_model=List[MedicationOut])
def list_medications(
    is_active: Optional[bool] = Query(None),
    user_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Medication)
    if is_active is not None:
        q = q.filter(Medication.is_active == is_active)
    if user_id:
        q = q.filter(Medication.user_id == user_id)
    return q.order_by(Medication.is_active.desc(), Medication.name.asc()).all()

@router.post("", response_model=MedicationOut)
def create_medication(payload: MedicationCreate, db: Session = Depends(get_db)):
    med = Medication(**payload.model_dump(exclude_unset=True))
    db.add(med)
    db.commit()
    db.refresh(med)
    return med

@router.patch("/{med_id}", response_model=MedicationOut)
def update_medication(med_id: int, payload: MedicationUpdate, db: Session = Depends(get_db)):
    med = db.get(Medication, med_id)
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(med, k, v)
    db.commit()
    db.refresh(med)
    return med

@router.delete("/{med_id}")
def delete_medication(med_id: int, db: Session = Depends(get_db)):
    med = db.get(Medication, med_id)
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
    db.delete(med)
    db.commit()
    return {"ok": True, "deleted_id": med_id}
