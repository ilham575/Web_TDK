from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import date

from database.connection import get_db
from routers.user import get_current_user
from models.absence import Absence as AbsenceModel, AbsenceType, AbsenceStatus
from schemas.absence import AbsenceCreate, AbsenceUpdate, AbsenceResponse

router = APIRouter(prefix="/absences", tags=["absences"])


@router.post('/', response_model=AbsenceResponse, status_code=status.HTTP_201_CREATED)
def create_absence(
    payload: AbsenceCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new absence/leave request for the current student."""
    if getattr(current_user, 'role', None) != 'student':
        raise HTTPException(status_code=403, detail='Only students can request absences')
    
    # Check if already exists for this date
    existing = db.query(AbsenceModel).filter(
        AbsenceModel.student_id == current_user.id,
        AbsenceModel.absence_date == payload.absence_date
    ).first()
    
    if existing:
        raise HTTPException(status_code=409, detail='Absence already exists for this date')
    
    new_absence = AbsenceModel(
        student_id=current_user.id,
        subject_id=payload.subject_id,
        absence_date=payload.absence_date,
        absence_type=payload.absence_type,
        reason=payload.reason,
        status=AbsenceStatus.PENDING
    )
    db.add(new_absence)
    db.commit()
    db.refresh(new_absence)
    return new_absence


@router.get('/', response_model=List[AbsenceResponse])
def list_absences(
    student_id: int = None,
    status: str = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """List absences. Students can only see their own; teachers/admins can see all if they have permission."""
    query = db.query(AbsenceModel)
    
    # If student, filter to own absences
    if getattr(current_user, 'role', None) == 'student':
        query = query.filter(AbsenceModel.student_id == current_user.id)
    elif student_id is not None:
        # Teacher/admin can filter by student_id
        query = query.filter(AbsenceModel.student_id == student_id)
    
    if status is not None:
        try:
            status_enum = AbsenceStatus(status)
            query = query.filter(AbsenceModel.status == status_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail='Invalid status value')
    
    absences = query.order_by(AbsenceModel.absence_date.desc()).all()
    return absences


@router.get('/{absence_id}', response_model=AbsenceResponse)
def get_absence(
    absence_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get a single absence record."""
    absence = db.query(AbsenceModel).filter(AbsenceModel.id == absence_id).first()
    
    if not absence:
        raise HTTPException(status_code=404, detail='Absence not found')
    
    # Students can only view their own absences
    if getattr(current_user, 'role', None) == 'student' and absence.student_id != current_user.id:
        raise HTTPException(status_code=403, detail='Not authorized to view this absence')
    
    return absence


@router.put('/{absence_id}', response_model=AbsenceResponse)
def update_absence(
    absence_id: int,
    payload: AbsenceUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update an absence record. Students can only update their own pending absences."""
    absence = db.query(AbsenceModel).filter(AbsenceModel.id == absence_id).first()
    
    if not absence:
        raise HTTPException(status_code=404, detail='Absence not found')
    
    # Students can only update their own pending absences
    if getattr(current_user, 'role', None) == 'student':
        if absence.student_id != current_user.id:
            raise HTTPException(status_code=403, detail='Not authorized to update this absence')
        if absence.status != AbsenceStatus.PENDING:
            raise HTTPException(status_code=400, detail='Can only update pending absences')
    
    if payload.absence_type is not None:
        absence.absence_type = payload.absence_type
    if payload.reason is not None:
        absence.reason = payload.reason
    if payload.status is not None:
        # Only admin/teacher can change status
        if getattr(current_user, 'role', None) not in ['admin', 'teacher']:
            raise HTTPException(status_code=403, detail='Not authorized to change status')
        absence.status = payload.status
    
    db.commit()
    db.refresh(absence)
    return absence


@router.delete('/{absence_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_absence(
    absence_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Delete an absence record. Students can only delete their own pending absences."""
    absence = db.query(AbsenceModel).filter(AbsenceModel.id == absence_id).first()
    
    if not absence:
        raise HTTPException(status_code=404, detail='Absence not found')
    
    # Students can only delete their own pending absences
    if getattr(current_user, 'role', None) == 'student':
        if absence.student_id != current_user.id:
            raise HTTPException(status_code=403, detail='Not authorized to delete this absence')
        if absence.status != AbsenceStatus.PENDING:
            raise HTTPException(status_code=400, detail='Can only delete pending absences')
    
    db.delete(absence)
    db.commit()
