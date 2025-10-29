from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from typing import List

from schemas.subject import Subject, SubjectCreate
from models.subject import Subject as SubjectModel
from database.connection import get_db
from routers.user import get_current_user

router = APIRouter(prefix="/subjects", tags=["subjects"])


@router.post("/", response_model=Subject, status_code=status.HTTP_201_CREATED)
def create_subject(subject: SubjectCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    # Allow admin to create for any teacher; allow teacher to create for themselves
    role = getattr(current_user, 'role', None)
    # determine teacher_id to assign
    teacher_id = subject.teacher_id
    # if current user is teacher, force teacher_id to current user's id
    if role == 'teacher':
        teacher_id = current_user.id
    elif role != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized to create subjects")

    # ensure school_id: if current_user has school_id, prefer it or validate
    school_id = subject.school_id
    if getattr(current_user, 'school_id', None) is not None:
        # if provided school_id and doesn't match current_user's school, reject
        if school_id is not None and int(school_id) != int(current_user.school_id):
            raise HTTPException(status_code=403, detail="Cannot create subject for different school")
        school_id = current_user.school_id

    new_sub = SubjectModel(
        name=subject.name,
        teacher_id=teacher_id,
        school_id=school_id
    )
    db.add(new_sub)
    db.commit()
    db.refresh(new_sub)
    return new_sub


@router.get("/", response_model=List[Subject])
def list_subjects(db: Session = Depends(get_db), school_id: int = None):
    query = db.query(SubjectModel)
    if school_id is not None:
        query = query.filter(SubjectModel.school_id == school_id)
    return query.order_by(SubjectModel.created_at.desc()).all()


@router.get("/teacher/{teacher_id}", response_model=List[Subject])
def subjects_by_teacher(teacher_id: int, db: Session = Depends(get_db)):
    return db.query(SubjectModel).filter(SubjectModel.teacher_id == teacher_id).all()


@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subject(subject_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    subj = db.query(SubjectModel).filter(SubjectModel.id == subject_id).first()
    if not subj:
        raise HTTPException(status_code=404, detail="Subject not found")
    # allow admin or the teacher assigned
    if (getattr(current_user, 'role', None) != 'admin') and (subj.teacher_id != getattr(current_user, 'id', None)):
        raise HTTPException(status_code=403, detail="Not authorized to delete this subject")
    db.delete(subj)
    db.commit()
    return
