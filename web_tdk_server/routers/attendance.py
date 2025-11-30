from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import json
from datetime import datetime, date

from database.connection import get_db
from routers.user import get_current_user
from models.subject import Subject as SubjectModel
from models.attendance import Attendance as AttendanceModel
from schemas.attendance import AttendanceMark, AttendanceResponse

router = APIRouter(prefix="/attendance", tags=["attendance"])


@router.post('/mark', status_code=status.HTTP_201_CREATED)
def mark_attendance(payload: AttendanceMark, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    # Only teacher assigned to subject or admin can mark attendance
    subj = db.query(SubjectModel).filter(SubjectModel.id == payload.subject_id).first()
    if not subj:
        raise HTTPException(status_code=404, detail='Subject not found')
    if getattr(current_user, 'role', None) != 'admin' and subj.teacher_id != getattr(current_user, 'id', None):
        raise HTTPException(status_code=403, detail='Not authorized to mark attendance for this subject')

    # Parse date
    if payload.date:
        try:
            d = datetime.strptime(payload.date, '%Y-%m-%d').date()
        except ValueError:
            raise HTTPException(status_code=400, detail='Invalid date format. Use YYYY-MM-DD')
    else:
        d = date.today()

    # find existing record for subject/date
    rec = db.query(AttendanceModel).filter(AttendanceModel.subject_id == payload.subject_id, AttendanceModel.date == d).first()
    attendance_json = json.dumps(payload.attendance)
    if rec:
        rec.present_json = attendance_json
        db.commit()
        db.refresh(rec)
        return { 'detail': 'updated', 'id': rec.id }
    new = AttendanceModel(subject_id=payload.subject_id, date=d, present_json=attendance_json)
    db.add(new)
    db.commit()
    db.refresh(new)
    return { 'detail': 'created', 'id': new.id }


@router.get('', response_model=List[AttendanceResponse])
@router.get('/', response_model=List[AttendanceResponse])
def list_attendance(subject_id: int = None, date: str = None, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    query = db.query(AttendanceModel)
    if subject_id is not None:
        query = query.filter(AttendanceModel.subject_id == subject_id)
    if date is not None:
        try:
            d = datetime.strptime(date, '%Y-%m-%d').date()
            query = query.filter(AttendanceModel.date == d)
        except ValueError:
            raise HTTPException(status_code=400, detail='Invalid date format. Use YYYY-MM-DD')
    rows = query.order_by(AttendanceModel.date.desc()).all()
    results = []
    for r in rows:
        attendance = {}
        try:
            attendance = json.loads(r.present_json) if r.present_json else {}
            # Handle backward compatibility: convert old list format to new dict format
            if isinstance(attendance, list):
                attendance = {str(sid): "present" for sid in attendance}
        except Exception:
            attendance = {}
        results.append({ 'id': r.id, 'subject_id': r.subject_id, 'date': r.date.isoformat(), 'attendance': attendance })
    return results
