from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict
from sqlalchemy import distinct, func
from datetime import datetime

from database.connection import get_db
from routers.user import get_current_user
from models.subject import Subject as SubjectModel
from models.grade import Grade as GradeModel
from models.user import User as UserModel
from models.subject_student import SubjectStudent as SubjectStudentModel
from models.classroom import ClassroomStudent as ClassroomStudentModel, Classroom as ClassroomModel
from models.classroom_subject import ClassroomSubject as ClassroomSubjectModel
from models.schedule import SubjectSchedule as SubjectScheduleModel
from models.school import School as SchoolModel
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
    is_authorized = False
    if getattr(current_user, 'role', None) == 'admin':
        is_authorized = True
    elif getattr(current_user, 'role', None) == 'teacher':
        if subj.teacher_id == current_user.id:
            is_authorized = True
        else:
            from models.schedule import SubjectSchedule
            if db.query(SubjectSchedule).filter_by(subject_id=subj.id, teacher_id=current_user.id).first():
                is_authorized = True
    
    if not is_authorized:
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
    # Check if grades are announced (only for students)
    if getattr(current_user, 'role', None) == 'student' and subject_id is not None:
        subject = db.query(SubjectModel).filter(SubjectModel.id == subject_id).first()
        if subject and subject.classroom_id:
            # Get classroom and school to check grade_announcement_date
            from models.classroom import Classroom as ClassroomModel
            classroom = db.query(ClassroomModel).filter(ClassroomModel.id == subject.classroom_id).first()
            if classroom:
                school = db.query(SchoolModel).filter(SchoolModel.id == classroom.school_id).first()
                if school and school.grade_announcement_date:
                    # Use UTC-aware datetime comparison (check if current time is before announcement date)
                    from datetime import timezone
                    now = datetime.now(timezone.utc)
                    announcement_date = school.grade_announcement_date
                    # Ensure announcement_date is timezone-aware for proper comparison
                    if announcement_date.tzinfo is None:
                        announcement_date = announcement_date.replace(tzinfo=timezone.utc)
                    if now < announcement_date:
                        raise HTTPException(status_code=403, detail='Grades have not been announced yet')
    
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
    is_authorized = False
    if user_role == 'admin':
        is_authorized = True
    elif user_role == 'teacher':
        if subj.teacher_id == current_user.id:
            is_authorized = True
        else:
            from models.schedule import SubjectSchedule
            if db.query(SubjectSchedule).filter_by(subject_id=subj.id, teacher_id=current_user.id).first():
                is_authorized = True
    
    if is_authorized:
        # Teacher or Admin assigned to this subject
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
    is_authorized = False
    if getattr(current_user, 'role', None) == 'admin':
        is_authorized = True
    elif getattr(current_user, 'role', None) == 'teacher':
        if subj.teacher_id == current_user.id:
            is_authorized = True
        else:
            from models.schedule import SubjectSchedule
            if db.query(SubjectSchedule).filter_by(subject_id=subj.id, teacher_id=current_user.id).first():
                is_authorized = True
    
    if not is_authorized:
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
    is_authorized = False
    if getattr(current_user, 'role', None) == 'admin':
        is_authorized = True
    elif getattr(current_user, 'role', None) == 'teacher':
        if subj.teacher_id == current_user.id:
            is_authorized = True
        else:
            from models.schedule import SubjectSchedule
            if db.query(SubjectSchedule).filter_by(subject_id=subj.id, teacher_id=current_user.id).first():
                is_authorized = True
                
    if not is_authorized:
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
    is_authorized = False
    if getattr(current_user, 'role', None) == 'admin':
        is_authorized = True
    elif getattr(current_user, 'role', None) == 'teacher':
        if subj.teacher_id == current_user.id:
            is_authorized = True
        else:
            from models.schedule import SubjectSchedule
            if db.query(SubjectSchedule).filter_by(subject_id=subj.id, teacher_id=current_user.id).first():
                is_authorized = True

    if not is_authorized:
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
    # Authorization: student can view own, admin can view all, or homeroom teacher
    is_authorized = False
    if getattr(current_user, 'role', None) == 'admin':
        is_authorized = True
    elif getattr(current_user, 'id', None) == student_id:
        is_authorized = True
    elif getattr(current_user, 'role', None) == 'teacher':
        # Check if homeroom teacher for any class these students might be in
        is_authorized = True # Allow teachers for now to support ranking view
    
    if not is_authorized:
        raise HTTPException(status_code=403, detail='Not authorized to view this student grades')
    
    # Check student exists
    student = db.query(UserModel).filter(UserModel.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail='Student not found')
    
    return calculate_activity_grades(db, student_id, classroom_id)


def _get_student_transcript_internal(student_id: int, classroom_id: int, db: Session):
    """Internal helper to calculate transcript using scaling logic consistent with UI."""
    # Get all subjects this student is enrolled in
    subjects = db.query(SubjectModel).join(
        SubjectStudentModel, SubjectModel.id == SubjectStudentModel.subject_id
    ).filter(SubjectStudentModel.student_id == student_id).all()
    
    regular_subjects = []
    
    def check_is_exam(title):
        if not title: return False
        t = title.lower()
        exam_keywords = ['กลางภาค', 'ปลายภาค', 'final', 'midterm', 'คะแนนสอบ']
        return any(keyword in t for keyword in exam_keywords)

    for subject in subjects:
        if subject.subject_type == 'activity':
            continue
            
        # Get grades for this subject
        grades_query = db.query(GradeModel).filter(
            GradeModel.subject_id == subject.id,
            GradeModel.student_id == student_id
        )
        # Apply classroom filter if provided (for classroom-specific assignments)
        if classroom_id:
            grades_query = grades_query.filter(
                (GradeModel.classroom_id == classroom_id) | (GradeModel.classroom_id.is_(None))
            )
            
        grades = grades_query.all()
        if not grades:
            continue
            
        raw_collected_score = 0.0
        raw_collected_max = 0.0
        raw_exam_score = 0.0
        raw_exam_max = 0.0
        
        manual_collected = None
        manual_exam = None
        
        has_real_collected = False
        has_real_exam = False
        
        for g in grades:
            # Handle manual summary titles
            if g.title == "คะแนนเก็บรวม":
                manual_collected = float(g.grade or 0)
                continue
            if g.title == "คะแนนสอบรวม":
                manual_exam = float(g.grade or 0)
                continue
            
            score = float(g.grade or 0)
            max_s = float(g.max_score or 100)
            
            if check_is_exam(g.title):
                has_real_exam = True
                raw_exam_score += score
                raw_exam_max += max_s
            else:
                has_real_collected = True
                raw_collected_score += score
                raw_collected_max += max_s
        
        # Subject level settings
        max_c = float(subject.max_collected_score or 100)
        max_e = float(subject.max_exam_score or 100)
        
        # Scaling logic for Collected Score
        if not has_real_collected and manual_collected is not None:
            final_collected = min(manual_collected, max_c)
        else:
            final_collected = (raw_collected_score / raw_collected_max * max_c) if raw_collected_max > 0 else raw_collected_score
            
        # Scaling logic for Exam Score
        if not has_real_exam and manual_exam is not None:
            final_exam = min(manual_exam, max_e)
        else:
            final_exam = (raw_exam_score / raw_exam_max * max_e) if raw_exam_max > 0 else raw_exam_score
            
        total_score = final_collected + final_exam
        total_max = max_c + max_e
        normalized = (total_score / total_max * 100) if total_max > 0 else 0
        
        # Get all teachers assigned to this subject (with is_ended status)
        all_schedules = db.query(SubjectScheduleModel).filter(
            SubjectScheduleModel.subject_id == subject.id
        ).all()
        
        teachers_list = []
        for sched in all_schedules:
            teacher = db.query(UserModel).filter(UserModel.id == sched.teacher_id).first()
            teacher_name = teacher.full_name or teacher.username if teacher else "Unknown"
            teachers_list.append({
                'id': sched.id,
                'teacher_id': sched.teacher_id,
                'teacher_name': teacher_name,
                'is_ended': sched.is_ended
            })

        regular_subjects.append({
            'subject_id': subject.id,
            'subject_name': subject.name,
            'subject_type': 'regular',
            'credits': subject.credits or 0,
            'score': round(total_score, 2),
            'max_score': round(total_max, 2),
            'normalized_score': round(normalized, 2),
            'teachers': teachers_list
        })
    
    # Calculate activity grades (Uses its own scaling logic to 100)
    activity_breakdown = calculate_activity_grades(db, student_id, classroom_id)
    
    # Build transcript
    transcript = regular_subjects
    if activity_breakdown['activity_subjects']:
        transcript.append({
            'subject_id': None,
            'subject_name': 'กิจกรรม (Activity)',
            'subject_type': 'activity',
            'credits': 0,
            'score': round(activity_breakdown['total_activity_score'], 2),
            'max_score': 100.0,
            'breakdown': activity_breakdown['activity_subjects'],
            'total_percent': round(activity_breakdown['total_activity_percent'], 2)
        })
    
    return transcript


@router.get('/student/{student_id}/transcript')
def get_student_transcript(student_id: int, classroom_id: int = None, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """
    Get student's full transcript with activity grades aggregated into a single "Activity" entry.
    Regular subjects show individual entries; activity subjects are combined.
    """
    # Authorization: Student themselves, Admin, or Teacher
    is_authorized = False
    if getattr(current_user, 'role', None) == 'admin':
        is_authorized = True
    elif getattr(current_user, 'id', None) == student_id:
        is_authorized = True
    elif getattr(current_user, 'role', None) == 'teacher':
        is_authorized = True 

    if not is_authorized:
        raise HTTPException(status_code=403, detail='Not authorized to view this student transcript')
    
    # Check student exists
    student = db.query(UserModel).filter(UserModel.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail='Student not found')
    
    return _get_student_transcript_internal(student_id, classroom_id, db)


@router.get('/classroom/{classroom_id}/ranking')
def get_classroom_ranking(classroom_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Calculate ranking for all students in a classroom based on weighted average of scores."""
    # Check authorization (Admin or Teacher or Student in this class)
    user_role = getattr(current_user, 'role', None)
    if user_role not in ['admin', 'teacher', 'student']:
        raise HTTPException(status_code=403, detail='Not authorized')

    # Get students in classroom
    students = db.query(UserModel).join(
        ClassroomStudentModel, UserModel.id == ClassroomStudentModel.student_id
    ).filter(ClassroomStudentModel.classroom_id == classroom_id).all()

    if not students:
        return []

    results = []
    for student in students:
        transcript = _get_student_transcript_internal(student.id, classroom_id, db)
        
        total_score = 0.0
        total_max = 0.0
        
        for item in transcript:
            # ใช้พจน์ 'score' และ 'max_score' ที่สรุปมาให้แล้วในแต่ละวิชา (รวมวิชากิจกรรมด้วยถ้ามีคะแนน)
            s = item.get('score') or 0.0
            m = item.get('max_score') or 0.0
            
            total_score += float(s)
            total_max += float(m)
        
        # คำนวณเปอร์เซ็นต์เฉลี่ยจากคะแนนรวมทั้งหมด
        final_percentage = (total_score / total_max * 100) if total_max > 0 else 0.0
        
        results.append({
            'student_id': student.id,
            'full_name': student.full_name,
            'username': student.username,
            'total_score': round(total_score, 2),
            'total_max_score': round(total_max, 2),
            'average_score': round(final_percentage, 2)
        })

    # Sort descending by total_score as requested
    results.sort(key=lambda x: x['total_score'], reverse=True)

    # Assign ranks
    current_rank = 0
    last_val = -1.0
    for i, item in enumerate(results):
        if item['total_score'] != last_val:
            current_rank = i + 1
            last_val = item['total_score']
        item['rank'] = current_rank

    return results


@router.get('/school/{school_id}/ranking')
def get_school_ranking(school_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Calculate ranking for all students in the entire school based on sum of scores."""
    # Check authorization (Admin or Teacher or Student in this school)
    user_role = getattr(current_user, 'role', None)
    if user_role not in ['admin', 'teacher', 'student']:
        raise HTTPException(status_code=403, detail='Not authorized')

    # Get students in school
    students = db.query(UserModel).filter(
        UserModel.school_id == school_id,
        UserModel.role == 'student'
    ).all()

    if not students:
        return []

    results = []
    for student in students:
        # Pass classroom_id=None to get overall grades
        transcript = _get_student_transcript_internal(student.id, None, db)
        
        total_score = 0.0
        total_max = 0.0
        
        for item in transcript:
            s = item.get('score') or 0.0
            m = item.get('max_score') or 0.0
            
            total_score += float(s)
            total_max += float(m)
        
        final_percentage = (total_score / total_max * 100) if total_max > 0 else 0.0
        
        results.append({
            'student_id': student.id,
            'full_name': student.full_name,
            'username': student.username,
            'total_score': round(total_score, 2),
            'total_max_score': round(total_max, 2),
            'average_score': round(final_percentage, 2)
        })

    # Sort descending by total_score
    results.sort(key=lambda x: x['total_score'], reverse=True)

    # Assign ranks
    current_rank = 0
    last_val = -1.0
    for i, item in enumerate(results):
        if item['total_score'] != last_val:
            current_rank = i + 1
            last_val = item['total_score']
        item['rank'] = current_rank

    return results

