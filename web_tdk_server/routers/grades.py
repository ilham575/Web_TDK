from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict
from sqlalchemy import distinct, func

from database.connection import get_db
from routers.user import get_current_user
from models.subject import Subject as SubjectModel
from models.grade import Grade as GradeModel
from models.user import User as UserModel
from models.subject_student import SubjectStudent as SubjectStudentModel
from models.classroom import ClassroomStudent as ClassroomStudentModel
from schemas.grade import GradesBulk, GradeResponse, AssignmentCreate, AssignmentUpdate, AssignmentResponse

router = APIRouter(prefix="/grades", tags=["grades"])


def calculate_activity_grades(db: Session, student_id: int, classroom_id: int = None):
    """
    Aggregate grades for all activity-type subjects for a student.
    Returns: {
        'activity_subjects': [list of activity subjects with breakdown],
        'total_activity_score': aggregated score (sum of score*percent, capped at 100),
        'total_activity_percent': sum of percentages
    }
    """
    # Find all activity subjects that have grades for this student
    activity_data = db.query(
        SubjectModel.id,
        SubjectModel.name,
        SubjectModel.activity_percentage
    ).filter(
        SubjectModel.subject_type == 'activity',
        SubjectModel.is_ended == False
    ).all()
    
    if not activity_data:
        return {
            'activity_subjects': [],
            'total_activity_score': None,
            'total_activity_percent': 0
        }
    
    activity_subjects = []
    total_score = 0
    total_percent = 0
    
    for subject_id, subject_name, activity_percent in activity_data:
        # Get all grades for this student in this subject
        grades = db.query(GradeModel).filter(
            GradeModel.subject_id == subject_id,
            GradeModel.student_id == student_id
        )
        
        if classroom_id:
            grades = grades.filter(GradeModel.classroom_id == classroom_id)
        
        grades = grades.all()
        
        if not grades:
            continue
        
        # Calculate average score for this subject
        valid_grades = [g for g in grades if g.grade is not None and g.max_score]
        if not valid_grades:
            continue
        
        avg_score = sum([g.grade for g in valid_grades]) / len(valid_grades)
        max_score = valid_grades[0].max_score  # Assume all have same max_score
        
        # Normalize to 100 scale
        normalized_score = (avg_score / max_score) * 100 if max_score else 0
        
        # Calculate contribution
        percent = activity_percent or 0
        contribution = (normalized_score * percent) / 100
        
        activity_subjects.append({
            'subject_id': subject_id,
            'subject_name': subject_name,
            'raw_score': round(avg_score, 2),
            'max_score': round(max_score, 2),
            'normalized_score': round(normalized_score, 2),
            'percentage': percent,
            'contribution': round(contribution, 2),
            'grade_count': len(valid_grades)
        })
        
        total_score += contribution
        total_percent += percent
    
    return {
        'activity_subjects': activity_subjects,
        'total_activity_score': min(round(total_score, 2), 100),  # Cap at 100
        'total_activity_percent': total_percent
    }


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
        # Filter by subject_id, student_id, title and classroom if provided
        if payload.classroom_id is not None:
            g = db.query(GradeModel).filter(
                GradeModel.subject_id == payload.subject_id,
                GradeModel.student_id == entry.student_id,
                GradeModel.title == payload.title,
                GradeModel.classroom_id == payload.classroom_id
            ).first()
        else:
            g = db.query(GradeModel).filter(
                GradeModel.subject_id == payload.subject_id,
                GradeModel.student_id == entry.student_id,
                GradeModel.title == payload.title,
                GradeModel.classroom_id.is_(None)
            ).first()
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
                grade=entry.grade,
                classroom_id=payload.classroom_id
            )
            db.add(new)
            db.commit()
            db.refresh(new)
            results.append(new)
    return { 'detail': 'ok', 'count': len(results) }


@router.get('', response_model=List[GradeResponse])
@router.get('/', response_model=List[GradeResponse])
def get_grades(subject_id: int = None, classroom_id: int = None, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    query = db.query(GradeModel)
    if subject_id is not None:
        query = query.filter(GradeModel.subject_id == subject_id)
    if classroom_id is not None:
        # ONLY return grades for this specific classroom (strict filter)
        query = query.filter(GradeModel.classroom_id == classroom_id)
    # When no classroom_id provided, return ALL grades (no additional filter)
    rows = query.all()
    return rows


@router.get('/assignments/{subject_id}', response_model=List[AssignmentResponse])
def get_assignments(subject_id: int, classroom_id: int = None, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
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

    # Get distinct assignments (unique title + max_score + classroom_id combinations)
    query = db.query(
        GradeModel.title,
        GradeModel.max_score,
        GradeModel.classroom_id
    ).filter(
        GradeModel.subject_id == subject_id,
        GradeModel.title.isnot(None)
    )
    if classroom_id is not None:
        # ONLY show assignments created for this specific classroom (strict filter)
        query = query.filter(GradeModel.classroom_id == classroom_id)
    # When no classroom_id provided, return ALL assignments (no additional filter)
    assignments = query.distinct().all()

    # Convert to response format with generated IDs
    result = []
    for idx, (title, max_score, classroom_id) in enumerate(assignments, 1):
        result.append({
            'id': idx,  # Use index as ID since we don't have assignment table
            'title': title,
            'max_score': max_score,
            'classroom_id': classroom_id
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
    # Check if assignment with same title already exists for the same classroom (or globally if classroom_id is None)
    if assignment.classroom_id is not None:
        existing = db.query(GradeModel).filter(
            GradeModel.subject_id == subject_id,
            GradeModel.title == assignment.title,
            GradeModel.classroom_id == assignment.classroom_id
        ).first()
    else:
        existing = db.query(GradeModel).filter(
            GradeModel.subject_id == subject_id,
            GradeModel.title == assignment.title,
            GradeModel.classroom_id.is_(None)
        ).first()

    if existing:
        raise HTTPException(status_code=400, detail='Assignment with this title already exists')

    # Get all students enrolled in this subject; optionally filter by classroom
    if assignment.classroom_id is not None:
        students = db.query(UserModel).join(
            SubjectStudentModel, UserModel.id == SubjectStudentModel.student_id
        ).join(
            ClassroomStudentModel, UserModel.id == ClassroomStudentModel.student_id
        ).filter(
            SubjectStudentModel.subject_id == subject_id,
            ClassroomStudentModel.classroom_id == assignment.classroom_id,
            ClassroomStudentModel.is_active == True
        ).all()
    else:
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
            grade=None,  # No grade yet
            classroom_id=assignment.classroom_id
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
        , 'classroom_id': assignment.classroom_id
    }


@router.put('/assignments/{subject_id}/{assignment_title}', response_model=AssignmentResponse)
def update_assignment(subject_id: int, assignment_title: str, assignment: AssignmentUpdate, classroom_id: int = None, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    subj = db.query(SubjectModel).filter(SubjectModel.id == subject_id).first()
    if not subj:
        raise HTTPException(status_code=404, detail='Subject not found')

    # Check authorization
    if getattr(current_user, 'role', None) != 'admin' and subj.teacher_id != getattr(current_user, 'id', None):
        raise HTTPException(status_code=403, detail='Not authorized to update assignments for this subject')

    # Check if assignment exists
    if classroom_id is not None:
        existing_grades = db.query(GradeModel).filter(
            GradeModel.subject_id == subject_id,
            GradeModel.title == assignment_title,
            GradeModel.classroom_id == classroom_id
        ).all()
    else:
        existing_grades = db.query(GradeModel).filter(
            GradeModel.subject_id == subject_id,
            GradeModel.title == assignment_title,
            GradeModel.classroom_id.is_(None)
        ).all()

    if not existing_grades:
        raise HTTPException(status_code=404, detail='Assignment not found')

    # Prepare new values
    new_title = assignment.title if assignment.title is not None else assignment_title
    new_max_score = assignment.max_score if assignment.max_score is not None else existing_grades[0].max_score

    # Check if new title conflicts with other assignments (if title is being changed)
    if assignment.title is not None and assignment.title != assignment_title:
        if classroom_id is not None:
            conflict = db.query(GradeModel).filter(
                GradeModel.subject_id == subject_id,
                GradeModel.title == assignment.title,
                GradeModel.classroom_id == classroom_id
            ).first()
        else:
            conflict = db.query(GradeModel).filter(
                GradeModel.subject_id == subject_id,
                GradeModel.title == assignment.title,
                GradeModel.classroom_id.is_(None)
            ).first()
        if conflict:
            raise HTTPException(status_code=400, detail='Assignment with this title already exists')

    # Update all grade records with this assignment
    for grade in existing_grades:
        if assignment.title is not None:
            grade.title = assignment.title
        if assignment.max_score is not None:
            grade.max_score = assignment.max_score
        # allow moving assignment to different classroom if specified
        if assignment.classroom_id is not None:
            grade.classroom_id = assignment.classroom_id
        grade.updated_at = func.now()

    db.commit()

    # Determine classroom_id for response
    new_classroom_id = assignment.classroom_id if assignment.classroom_id is not None else (existing_grades[0].classroom_id if existing_grades else None)

    # Return updated assignment info
    return {
        'id': 0,  # Not used in frontend
        'title': new_title,
        'max_score': new_max_score,
        'classroom_id': new_classroom_id
    }


@router.delete('/assignments/{subject_id}/{assignment_title}')
def delete_assignment(subject_id: int, assignment_title: str, classroom_id: int = None, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    subj = db.query(SubjectModel).filter(SubjectModel.id == subject_id).first()
    if not subj:
        raise HTTPException(status_code=404, detail='Subject not found')

    # Check authorization
    if getattr(current_user, 'role', None) != 'admin' and subj.teacher_id != getattr(current_user, 'id', None):
        raise HTTPException(status_code=403, detail='Not authorized to delete assignments for this subject')

    # Check if assignment exists
    if classroom_id is not None:
        existing_grades = db.query(GradeModel).filter(
            GradeModel.subject_id == subject_id,
            GradeModel.title == assignment_title,
            GradeModel.classroom_id == classroom_id
        ).all()
    else:
        existing_grades = db.query(GradeModel).filter(
            GradeModel.subject_id == subject_id,
            GradeModel.title == assignment_title,
            GradeModel.classroom_id.is_(None)
        ).all()

    if not existing_grades:
        raise HTTPException(status_code=404, detail='Assignment not found')

    # Delete all grade records with this assignment
    for grade in existing_grades:
        db.delete(grade)

    db.commit()

    return {'detail': 'Assignment deleted successfully'}


@router.get('/student/{student_id}/activity-breakdown')
def get_student_activity_breakdown(student_id: int, classroom_id: int = None, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """
    Get activity grade breakdown for a student.
    Includes individual activity subjects with their raw scores, percentages, and calculated contributions.
    """
    # Authorization: student can view own, admin can view all
    if getattr(current_user, 'role', None) != 'admin' and getattr(current_user, 'id', None) != student_id:
        raise HTTPException(status_code=403, detail='Not authorized to view this student grades')
    
    # Check student exists
    student = db.query(UserModel).filter(UserModel.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail='Student not found')
    
    return calculate_activity_grades(db, student_id, classroom_id)


@router.get('/student/{student_id}/transcript')
def get_student_transcript(student_id: int, classroom_id: int = None, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """
    Get student's full transcript with activity grades aggregated into a single "Activity" entry.
    Regular subjects show individual entries; activity subjects are combined.
    """
    # Authorization
    if getattr(current_user, 'role', None) != 'admin' and getattr(current_user, 'id', None) != student_id:
        raise HTTPException(status_code=403, detail='Not authorized to view this student transcript')
    
    # Check student exists
    student = db.query(UserModel).filter(UserModel.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail='Student not found')
    
    # Get all subjects this student is enrolled in
    query = db.query(
        SubjectModel.id,
        SubjectModel.name,
        SubjectModel.subject_type,
        SubjectModel.activity_percentage,
        SubjectModel.credits
    ).join(
        SubjectStudentModel, SubjectModel.id == SubjectStudentModel.subject_id
    ).filter(SubjectStudentModel.student_id == student_id)
    
    if classroom_id:
        query = query.join(
            ClassroomStudentModel, ClassroomStudentModel.student_id == student_id
        ).filter(ClassroomStudentModel.classroom_id == classroom_id)
    
    subjects = query.all()
    
    regular_subjects = []
    
    # Process regular subjects
    for subject_id, subject_name, subject_type, activity_percent, credits in subjects:
        if subject_type != 'activity':
            # Get average grade for regular subject
            grades = db.query(GradeModel).filter(
                GradeModel.subject_id == subject_id,
                GradeModel.student_id == student_id
            )
            
            if classroom_id:
                grades = grades.filter(GradeModel.classroom_id == classroom_id)
            
            grades = grades.all()
            
            if not grades:
                continue
            
            valid_grades = [g for g in grades if g.grade is not None and g.max_score]
            if not valid_grades:
                continue
            
            avg_score = sum([g.grade for g in valid_grades]) / len(valid_grades)
            max_score = valid_grades[0].max_score
            normalized = (avg_score / max_score) * 100 if max_score else 0
            
            regular_subjects.append({
                'subject_id': subject_id,
                'subject_name': subject_name,
                'subject_type': 'regular',
                'credits': credits,
                'score': round(avg_score, 2),
                'max_score': round(max_score, 2),
                'normalized_score': round(normalized, 2)
            })
    
    # Calculate activity grades
    activity_breakdown = calculate_activity_grades(db, student_id, classroom_id)
    
    # Build transcript
    transcript = regular_subjects
    
    if activity_breakdown['activity_subjects']:
        transcript.append({
            'subject_id': None,
            'subject_name': 'กิจกรรม (Activity)',
            'subject_type': 'activity',
            'credits': 0,
            'score': activity_breakdown['total_activity_score'],
            'breakdown': activity_breakdown['activity_subjects'],
            'total_percent': activity_breakdown['total_activity_percent']
        })
    
    return transcript
