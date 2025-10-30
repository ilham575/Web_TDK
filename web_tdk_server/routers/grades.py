from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database.connection import get_db
from routers.user import get_current_user
from models.subject import Subject as SubjectModel
from models.grade import Grade as GradeModel
from schemas.grade import GradesBulk, GradeResponse

router = APIRouter(prefix="/grades", tags=["grades"])


@router.post('/bulk', status_code=status.HTTP_201_CREATED)
def bulk_grades(payload: GradesBulk, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    subj = db.query(SubjectModel).filter(SubjectModel.id == payload.subject_id).first()
    if not subj:
        raise HTTPException(status_code=404, detail='Subject not found')
    # only admin or teacher assigned can submit grades
    if getattr(current_user, 'role', None) != 'admin' and subj.teacher_id != getattr(current_user, 'id', None):
        raise HTTPException(status_code=403, detail='Not authorized to submit grades for this subject')

    results = []
    for entry in payload.grades:
        g = db.query(GradeModel).filter(GradeModel.subject_id == payload.subject_id, GradeModel.student_id == entry.student_id).first()
        if g:
            g.grade = entry.grade
            db.commit()
            db.refresh(g)
            results.append(g)
        else:
            new = GradeModel(subject_id=payload.subject_id, student_id=entry.student_id, grade=entry.grade)
            db.add(new)
            db.commit()
            db.refresh(new)
            results.append(new)
    return { 'detail': 'ok', 'count': len(results) }


@router.get('/', response_model=List[GradeResponse])
def get_grades(subject_id: int = None, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    query = db.query(GradeModel)
    if subject_id is not None:
        query = query.filter(GradeModel.subject_id == subject_id)
    rows = query.all()
    return rows
