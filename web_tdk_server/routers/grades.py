from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from sqlalchemy import distinct, func

from database.connection import get_db
from routers.user import get_current_user
from models.subject import Subject as SubjectModel
from models.grade import Grade as GradeModel
from models.user import User as UserModel
from models.subject_student import SubjectStudent as SubjectStudentModel
from schemas.grade import GradesBulk, GradeResponse, AssignmentCreate, AssignmentUpdate, AssignmentResponse

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
        g = db.query(GradeModel).filter(GradeModel.subject_id == payload.subject_id, GradeModel.student_id == entry.student_id, GradeModel.title == payload.title).first()
        if g:
            g.title = payload.title
            g.max_score = payload.max_score
            g.grade = entry.grade
            db.commit()
            db.refresh(g)
            results.append(g)
        else:
            new = GradeModel(
                subject_id=payload.subject_id,
                student_id=entry.student_id,
                title=payload.title,
                max_score=payload.max_score,
                grade=entry.grade
            )
            db.add(new)
            db.commit()
            db.refresh(new)
            results.append(new)
    return { 'detail': 'ok', 'count': len(results) }


@router.get('', response_model=List[GradeResponse])
@router.get('/', response_model=List[GradeResponse])
def get_grades(subject_id: int = None, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    query = db.query(GradeModel)
    if subject_id is not None:
        query = query.filter(GradeModel.subject_id == subject_id)
    rows = query.all()
    return rows


@router.get('/assignments/{subject_id}', response_model=List[AssignmentResponse])
def get_assignments(subject_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    subj = db.query(SubjectModel).filter(SubjectModel.id == subject_id).first()
    if not subj:
        raise HTTPException(status_code=404, detail='Subject not found')

    # Check authorization
    user_role = getattr(current_user, 'role', None)
    if user_role == 'admin':
        # Admin can view all
        pass
    elif user_role == 'teacher' and subj.teacher_id == getattr(current_user, 'id', None):
        # Teacher assigned to this subject
        pass
    elif user_role == 'student':
        # Check if student is enrolled in this subject
        enrollment = db.query(SubjectStudentModel).filter(
            SubjectStudentModel.subject_id == subject_id,
            SubjectStudentModel.student_id == getattr(current_user, 'id', None)
        ).first()
        if not enrollment:
            raise HTTPException(status_code=403, detail='Not authorized to view assignments for this subject')
    else:
        raise HTTPException(status_code=403, detail='Not authorized to view assignments for this subject')

    # Get distinct assignments (unique title + max_score combinations)
    assignments = db.query(
        GradeModel.title,
        GradeModel.max_score
    ).filter(
        GradeModel.subject_id == subject_id,
        GradeModel.title.isnot(None)
    ).distinct().all()

    # Convert to response format with generated IDs
    result = []
    for idx, (title, max_score) in enumerate(assignments, 1):
        result.append({
            'id': idx,  # Use index as ID since we don't have assignment table
            'title': title,
            'max_score': max_score
        })

    return result


@router.post('/assignments/{subject_id}', response_model=AssignmentResponse)
def create_assignment(subject_id: int, assignment: AssignmentCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    subj = db.query(SubjectModel).filter(SubjectModel.id == subject_id).first()
    if not subj:
        raise HTTPException(status_code=404, detail='Subject not found')

    # Check authorization
    if getattr(current_user, 'role', None) != 'admin' and subj.teacher_id != getattr(current_user, 'id', None):
        raise HTTPException(status_code=403, detail='Not authorized to create assignments for this subject')

    # Check if assignment with same title already exists
    existing = db.query(GradeModel).filter(
        GradeModel.subject_id == subject_id,
        GradeModel.title == assignment.title
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail='Assignment with this title already exists')

    # Get all students enrolled in this subject
    students = db.query(UserModel).join(
        SubjectStudentModel, UserModel.id == SubjectStudentModel.student_id
    ).filter(SubjectStudentModel.subject_id == subject_id).all()

    if not students:
        raise HTTPException(status_code=400, detail='No students enrolled in this subject')

    # Create grade records for all students with this assignment
    created_grades = []
    for student in students:
        grade = GradeModel(
            subject_id=subject_id,
            student_id=student.id,
            title=assignment.title,
            max_score=assignment.max_score,
            grade=None  # No grade yet
        )
        db.add(grade)
        created_grades.append(grade)

    db.commit()

    # Return assignment info
    return {
        'id': len(db.query(GradeModel.title, GradeModel.max_score).filter(
            GradeModel.subject_id == subject_id,
            GradeModel.title.isnot(None)
        ).distinct().all()),
        'title': assignment.title,
        'max_score': assignment.max_score
    }


@router.put('/assignments/{subject_id}/{assignment_title}', response_model=AssignmentResponse)
def update_assignment(subject_id: int, assignment_title: str, assignment: AssignmentUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    subj = db.query(SubjectModel).filter(SubjectModel.id == subject_id).first()
    if not subj:
        raise HTTPException(status_code=404, detail='Subject not found')

    # Check authorization
    if getattr(current_user, 'role', None) != 'admin' and subj.teacher_id != getattr(current_user, 'id', None):
        raise HTTPException(status_code=403, detail='Not authorized to update assignments for this subject')

    # Check if assignment exists
    existing_grades = db.query(GradeModel).filter(
        GradeModel.subject_id == subject_id,
        GradeModel.title == assignment_title
    ).all()

    if not existing_grades:
        raise HTTPException(status_code=404, detail='Assignment not found')

    # Prepare new values
    new_title = assignment.title if assignment.title is not None else assignment_title
    new_max_score = assignment.max_score if assignment.max_score is not None else existing_grades[0].max_score

    # Check if new title conflicts with other assignments (if title is being changed)
    if assignment.title is not None and assignment.title != assignment_title:
        conflict = db.query(GradeModel).filter(
            GradeModel.subject_id == subject_id,
            GradeModel.title == assignment.title
        ).first()
        if conflict:
            raise HTTPException(status_code=400, detail='Assignment with this title already exists')

    # Update all grade records with this assignment
    for grade in existing_grades:
        if assignment.title is not None:
            grade.title = assignment.title
        if assignment.max_score is not None:
            grade.max_score = assignment.max_score
        grade.updated_at = func.now()

    db.commit()

    # Return updated assignment info
    return {
        'id': 0,  # Not used in frontend
        'title': new_title,
        'max_score': new_max_score
    }


@router.delete('/assignments/{subject_id}/{assignment_title}')
def delete_assignment(subject_id: int, assignment_title: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    subj = db.query(SubjectModel).filter(SubjectModel.id == subject_id).first()
    if not subj:
        raise HTTPException(status_code=404, detail='Subject not found')

    # Check authorization
    if getattr(current_user, 'role', None) != 'admin' and subj.teacher_id != getattr(current_user, 'id', None):
        raise HTTPException(status_code=403, detail='Not authorized to delete assignments for this subject')

    # Check if assignment exists
    existing_grades = db.query(GradeModel).filter(
        GradeModel.subject_id == subject_id,
        GradeModel.title == assignment_title
    ).all()

    if not existing_grades:
        raise HTTPException(status_code=404, detail='Assignment not found')

    # Delete all grade records with this assignment
    for grade in existing_grades:
        db.delete(grade)

    db.commit()

    return {'detail': 'Assignment deleted successfully'}
