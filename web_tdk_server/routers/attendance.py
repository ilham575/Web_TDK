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

    d = payload.date or date.today()
    # find existing record for subject/date
    rec = db.query(AttendanceModel).filter(AttendanceModel.subject_id == payload.subject_id, AttendanceModel.date == d).first()
    present_json = json.dumps(payload.present)
    if rec:
        rec.present_json = present_json
        db.commit()
        db.refresh(rec)
        return { 'detail': 'updated', 'id': rec.id }
    new = AttendanceModel(subject_id=payload.subject_id, date=d, present_json=present_json)
    db.add(new)
    db.commit()
    db.refresh(new)
    return { 'detail': 'created', 'id': new.id }


@router.get('/', response_model=List[AttendanceResponse])
def list_attendance(subject_id: int = None, date: date = None, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    query = db.query(AttendanceModel)
    if subject_id is not None:
        query = query.filter(AttendanceModel.subject_id == subject_id)
    if date is not None:
        query = query.filter(AttendanceModel.date == date)
    rows = query.order_by(AttendanceModel.date.desc()).all()
    results = []
    for r in rows:
        present = []
        try:
            present = json.loads(r.present_json) if r.present_json else []
        except Exception:
            present = []
        results.append({ 'id': r.id, 'subject_id': r.subject_id, 'date': r.date, 'present': present })
    return results
