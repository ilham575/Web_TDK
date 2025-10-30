from fastapi import APIRouter, HTTPException, Depends, status, Body
from sqlalchemy.orm import Session
from typing import List

from schemas.subject import Subject, SubjectCreate
from models.subject import Subject as SubjectModel
from models.subject_student import SubjectStudent as SubjectStudentModel
from models.user import User as UserModel
from database.connection import get_db
from routers.user import get_current_user
from schemas.user import User as UserSchema

router = APIRouter(prefix="/subjects", tags=["subjects"])


@router.post("/", response_model=Subject, status_code=status.HTTP_201_CREATED)
def create_subject(subject: SubjectCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    # Only admin can create subjects and assign to teachers
    role = getattr(current_user, 'role', None)
    if role != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized to create subjects")

    school_id = subject.school_id or getattr(current_user, 'school_id', None)
    # if provided school_id and doesn't match current_user's school, reject
    if getattr(current_user, 'school_id', None) is not None and school_id is not None and int(school_id) != int(current_user.school_id):
        raise HTTPException(status_code=403, detail="Cannot create subject for different school")

    new_sub = SubjectModel(
        name=subject.name,
        teacher_id=subject.teacher_id,
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


@router.get('/student/{student_id}', response_model=List[Subject])
def subjects_by_student(student_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    # allow student to fetch their own subjects, or admin to fetch any
    if getattr(current_user, 'role', None) != 'admin' and getattr(current_user, 'id', None) != int(student_id):
        raise HTTPException(status_code=403, detail='Not authorized to view subjects for this student')
    # join SubjectStudent -> Subject
    subs = db.query(SubjectModel).join(SubjectStudentModel, SubjectStudentModel.subject_id == SubjectModel.id).filter(SubjectStudentModel.student_id == student_id).all()
    return subs


@router.get("/{subject_id}/students", response_model=List[UserSchema])
def get_subject_students(subject_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    # list students enrolled in subject
    subj = db.query(SubjectModel).filter(SubjectModel.id == subject_id).first()
    if not subj:
        raise HTTPException(status_code=404, detail="Subject not found")
    # only admin or assigned teacher can view
    if getattr(current_user, 'role', None) != 'admin' and subj.teacher_id != getattr(current_user, 'id', None):
        raise HTTPException(status_code=403, detail='Not authorized to view students for this subject')
    # join subject_students -> users
    student_rows = db.query(UserModel).join(SubjectStudentModel, SubjectStudentModel.student_id == UserModel.id).filter(SubjectStudentModel.subject_id == subject_id).all()
    return student_rows


@router.post("/{subject_id}/enroll", status_code=status.HTTP_201_CREATED)
def enroll_student(subject_id: int, student_id: int = Body(..., embed=True), db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    subj = db.query(SubjectModel).filter(SubjectModel.id == subject_id).first()
    if not subj:
        raise HTTPException(status_code=404, detail="Subject not found")
    # only admin or teacher assigned to subject can enroll
    if getattr(current_user, 'role', None) != 'admin' and subj.teacher_id != getattr(current_user, 'id', None):
        raise HTTPException(status_code=403, detail='Not authorized to enroll students to this subject')
    # ensure student exists and is a student
    student = db.query(UserModel).filter(UserModel.id == student_id, UserModel.role == 'student').first()
    if not student:
        raise HTTPException(status_code=404, detail='Student not found')
    # prevent duplicate
    exists = db.query(SubjectStudentModel).filter(SubjectStudentModel.subject_id == subject_id, SubjectStudentModel.student_id == student_id).first()
    if exists:
        raise HTTPException(status_code=400, detail='Student already enrolled')
    rel = SubjectStudentModel(subject_id=subject_id, student_id=student_id)
    db.add(rel)
    db.commit()
    db.refresh(rel)
    return { 'detail': 'enrolled', 'id': rel.id }


@router.delete("/{subject_id}/enroll/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def unenroll_student(subject_id: int, student_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    subj = db.query(SubjectModel).filter(SubjectModel.id == subject_id).first()
    if not subj:
        raise HTTPException(status_code=404, detail="Subject not found")
    if getattr(current_user, 'role', None) != 'admin' and subj.teacher_id != getattr(current_user, 'id', None):
        raise HTTPException(status_code=403, detail='Not authorized to unenroll students from this subject')
    rel = db.query(SubjectStudentModel).filter(SubjectStudentModel.subject_id == subject_id, SubjectStudentModel.student_id == student_id).first()
    if not rel:
        raise HTTPException(status_code=404, detail='Enrollment not found')
    db.delete(rel)
    db.commit()
    return


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
