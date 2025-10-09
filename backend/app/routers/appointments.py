from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.auth import get_current_user
from app.models_appointment import Appointment
from app.schemas_appointment import AppointmentCreate, AppointmentUpdate, AppointmentOut

router = APIRouter(prefix="/api/appointments", tags=["appointments"])

@router.get("", response_model=List[AppointmentOut])
def list_appointments(
    status: Optional[str] = Query(None),
    appointment_type: Optional[str] = Query(None),
    upcoming_only: Optional[bool] = Query(False),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get user's appointments with optional filtering"""
    user_id = current_user.get("uid")
    q = db.query(Appointment).filter(Appointment.user_id == user_id)
    
    if status:
        q = q.filter(Appointment.status == status)
    if appointment_type:
        q = q.filter(Appointment.appointment_type == appointment_type)
    if upcoming_only:
        q = q.filter(Appointment.scheduled_date >= datetime.now())
    
    return q.order_by(Appointment.scheduled_date.asc()).all()

@router.post("", response_model=AppointmentOut)
def create_appointment(
    payload: AppointmentCreate, 
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new appointment for the current user"""
    user_id = current_user.get("uid")
    appointment_data = payload.model_dump(exclude_unset=True)
    appointment_data["user_id"] = user_id  # Ensure user_id is set
    
    # Calculate end_time if not provided
    if not appointment_data.get("end_time") and appointment_data.get("scheduled_date") and appointment_data.get("duration_minutes"):
        from datetime import timedelta
        start_time = appointment_data["scheduled_date"]
        if isinstance(start_time, str):
            start_time = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
        appointment_data["end_time"] = start_time + timedelta(minutes=appointment_data["duration_minutes"])
    
    appointment = Appointment(**appointment_data)
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    return appointment

@router.patch("/{appointment_id}", response_model=AppointmentOut)
def update_appointment(
    appointment_id: int, 
    payload: AppointmentUpdate, 
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an appointment (only if it belongs to the current user)"""
    user_id = current_user.get("uid")
    appointment = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.user_id == user_id
    ).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    update_data = payload.model_dump(exclude_unset=True)
    
    # Recalculate end_time if scheduled_date or duration_minutes changed
    if "scheduled_date" in update_data or "duration_minutes" in update_data:
        scheduled_date = update_data.get("scheduled_date", appointment.scheduled_date)
        duration_minutes = update_data.get("duration_minutes", appointment.duration_minutes)
        if scheduled_date and duration_minutes:
            from datetime import timedelta
            if isinstance(scheduled_date, str):
                scheduled_date = datetime.fromisoformat(scheduled_date.replace('Z', '+00:00'))
            update_data["end_time"] = scheduled_date + timedelta(minutes=duration_minutes)
    
    for k, v in update_data.items():
        setattr(appointment, k, v)
    db.commit()
    db.refresh(appointment)
    return appointment

@router.delete("/{appointment_id}")
def delete_appointment(
    appointment_id: int, 
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an appointment (only if it belongs to the current user)"""
    user_id = current_user.get("uid")
    appointment = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.user_id == user_id
    ).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    db.delete(appointment)
    db.commit()
    return {"ok": True, "deleted_id": appointment_id}
