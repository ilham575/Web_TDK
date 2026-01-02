from fastapi import APIRouter, HTTPException, Depends, status, Body
from sqlalchemy.orm import Session
from typing import List

from schemas.subject import Subject, SubjectCreate, SubjectTeacher, SubjectTeacherCreate
from schemas.schedule import SubjectSchedule as SubjectScheduleSchema, SubjectScheduleCreate as SubjectScheduleCreateSchema, StudentScheduleResponse
from models.subject import Subject as SubjectModel
from models.subject_student import SubjectStudent as SubjectStudentModel
from models.classroom_subject import ClassroomSubject as ClassroomSubjectModel
from models.user import User as UserModel
from models.classroom import Classroom as ClassroomModel, ClassroomStudent as ClassroomStudentModel
from models.schedule import SubjectSchedule as SubjectScheduleModel
from database.connection import get_db
from routers.user import get_current_user
from schemas.user import User as UserSchema

router = APIRouter(prefix="/subjects", tags=["subjects"])

def validate_activity_percentage(db: Session, subject_id: int = None, new_percentage: int = None, school_id: int = None):
    """
    Validate that activity subjects' total percentage does not exceed 100%
    If subject_id is provided, exclude it from the check (for updates)
    """
    if not new_percentage or new_percentage <= 0:
        return  # No validation needed if percentage is None or <= 0
    
    if new_percentage > 100:
        raise HTTPException(status_code=400, detail="Activity percentage cannot exceed 100%")
    
    # Check total percentage across all activity subjects in the school
    # (since activity subjects are defined per subject, not per classroom)
    if school_id:
        activity_subjects = db.query(SubjectModel).filter(
            SubjectModel.school_id == school_id,
            SubjectModel.subject_type == 'activity',
            SubjectModel.is_ended == False
        ).all()
        
        # Calculate total percentage excluding current subject
        total_percent = sum([
            s.activity_percentage or 0 
            for s in activity_subjects 
            if s.id != subject_id
        ])
        
        if total_percent + new_percentage > 100:
            raise HTTPException(
                status_code=400, 
                detail=f"Activity subjects exceed 100%: current total {total_percent}% + new {new_percentage}% = {total_percent + new_percentage}%"
            )


@router.post("", response_model=Subject, status_code=status.HTTP_201_CREATED)
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

    # Validate activity_percentage if subject_type is 'activity'
    if subject.subject_type == 'activity' and getattr(subject, 'activity_percentage', None):
        validate_activity_percentage(db, new_percentage=subject.activity_percentage, school_id=school_id)

    new_sub = SubjectModel(
        name=subject.name,
        code=subject.code,
        subject_type=subject.subject_type or 'main',
        teacher_id=subject.teacher_id,
        school_id=school_id,
        credits=getattr(subject, 'credits', None),
        activity_percentage=getattr(subject, 'activity_percentage', None)
    )
    db.add(new_sub)
    db.commit()
    db.refresh(new_sub)
    return new_sub


@router.patch("/{subject_id}", response_model=Subject)
def update_subject(subject_id: int, subject: SubjectCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Update an existing subject"""
    # Only admin can update subjects
    role = getattr(current_user, 'role', None)
    if role != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized to update subjects")
    
    subj = db.query(SubjectModel).filter(SubjectModel.id == subject_id).first()
    if not subj:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    # Verify school ownership
    if getattr(current_user, 'school_id', None) is not None and subj.school_id is not None and int(subj.school_id) != int(current_user.school_id):
        raise HTTPException(status_code=403, detail="Cannot update subject for different school")
    
    # Validate activity_percentage if changing to activity type or updating percentage
    new_type = subject.subject_type or subj.subject_type
    new_percent = getattr(subject, 'activity_percentage', None) or subj.activity_percentage
    if new_type == 'activity' and new_percent:
        validate_activity_percentage(db, subject_id=subject_id, new_percentage=new_percent, school_id=subj.school_id)
    
    # Update fields
    if subject.name:
        subj.name = subject.name
    if subject.code:
        subj.code = subject.code
    if subject.subject_type:
        subj.subject_type = subject.subject_type
    if subject.teacher_id is not None:
        subj.teacher_id = subject.teacher_id
    # optional new fields
    if getattr(subject, 'credits', None) is not None:
        subj.credits = subject.credits
    if getattr(subject, 'activity_percentage', None) is not None:
        subj.activity_percentage = subject.activity_percentage
    
    db.commit()
    db.refresh(subj)
    return subj


@router.get("", response_model=List[Subject])
@router.get("/", response_model=List[Subject])
def list_subjects(db: Session = Depends(get_db), school_id: int = None):
    query = db.query(SubjectModel)
    if school_id is not None:
        query = query.filter(SubjectModel.school_id == school_id)
    return query.order_by(SubjectModel.created_at.desc()).all()


@router.get("/{subject_id}", response_model=Subject)
def get_subject(subject_id: int, db: Session = Depends(get_db)):
    """Get a single subject by ID"""
    subject = db.query(SubjectModel).filter(SubjectModel.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    return subject


@router.get("/teacher/{teacher_id}", response_model=List[dict])
def subjects_by_teacher(teacher_id: int, db: Session = Depends(get_db)):
    # Get all subjects where the teacher is assigned via SubjectSchedule (both active and ended)
    subjects = db.query(SubjectModel).join(
        SubjectScheduleModel, SubjectModel.id == SubjectScheduleModel.subject_id
    ).filter(
        SubjectScheduleModel.teacher_id == teacher_id
    ).distinct().all()
    
    result = []
    for subject in subjects:
        # Get the teacher assignment for this teacher
        schedule = db.query(SubjectScheduleModel).filter(
            SubjectScheduleModel.subject_id == subject.id,
            SubjectScheduleModel.teacher_id == teacher_id
        ).first()
        
        # Get all teachers assigned to this subject (with is_ended status)
        all_schedules = db.query(SubjectScheduleModel).filter(
            SubjectScheduleModel.subject_id == subject.id
        ).all()
        
        teachers_list = []
        for sched in all_schedules:
            teacher = db.query(UserModel).filter(UserModel.id == sched.teacher_id).first()
            teacher_name = teacher.full_name or teacher.username if teacher else "Unknown"
            
            classroom_name = None
            if sched.classroom_id:
                classroom = db.query(ClassroomModel).filter(ClassroomModel.id == sched.classroom_id).first()
                classroom_name = classroom.name if classroom else None
            
            teachers_list.append({
                'id': sched.id,  # SubjectSchedule ID
                'schedule_id': sched.id,  # Keep for clarity
                'teacher_id': sched.teacher_id,  # Teacher user ID
                'teacher_name': teacher_name,
                'name': teacher_name,  # For backward compat
                'classroom_id': sched.classroom_id,
                'classroom_name': classroom_name,
                'is_ended': sched.is_ended  # Add is_ended for each teacher
            })
        
        # Count classrooms
        classroom_count = db.query(ClassroomSubjectModel).filter(
            ClassroomSubjectModel.subject_id == subject.id
        ).count()
        
        # Count enrolled students
        student_count = db.query(SubjectStudentModel).filter(
            SubjectStudentModel.subject_id == subject.id
        ).count()
        
        # For backward compatibility, teacher_name is the first teacher
        teacher_name = teachers_list[0]['name'] if teachers_list else None
        
        result.append({
            'id': subject.id,
            'name': subject.name,
            'code': subject.code,
            'subject_type': subject.subject_type,
            'teacher_id': subject.teacher_id,
            'teacher_name': teacher_name,
            'school_id': subject.school_id,
            'credits': subject.credits,
            'activity_percentage': subject.activity_percentage,
            'is_ended': subject.is_ended,
            'created_at': subject.created_at,
            'updated_at': subject.updated_at,
            'teachers': teachers_list,  # Return teachers with is_ended
            'teacher_count': len(teachers_list),
            'classroom_count': classroom_count,
            'student_count': student_count,
            'teacher_is_ended': schedule.is_ended if schedule else False
        })
    
    return result


@router.get('/student/{student_id}', response_model=List[Subject])
def subjects_by_student(student_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    # allow student to fetch their own subjects, or admin to fetch any
    if getattr(current_user, 'role', None) != 'admin' and getattr(current_user, 'id', None) != int(student_id):
        raise HTTPException(status_code=403, detail='Not authorized to view subjects for this student')
    # join SubjectStudent -> Subject
    subs = db.query(SubjectModel).join(SubjectStudentModel, SubjectStudentModel.subject_id == SubjectModel.id).filter(SubjectStudentModel.student_id == student_id).all()
    return subs


@router.get("/{subject_id}/students")
def get_subject_students(subject_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """List students for a subject.

    Behavior:
    - Admin: sees all students enrolled in subject and students in classrooms assigned to the subject.
    - Teacher: if assigned to subject as global (classroom_id is NULL in SubjectSchedule) -> sees all as admin.
               else (assigned to specific classrooms) -> sees only students that are in those classrooms or individually enrolled AND belong to those classrooms.
    """
    subj = db.query(SubjectModel).filter(SubjectModel.id == subject_id).first()
    if not subj:
        raise HTTPException(status_code=404, detail="Subject not found")

    user_role = getattr(current_user, 'role', None)

    # Determine teacher assignment for this subject
    teacher_schedules = []
    if user_role == 'teacher':
        teacher_schedules = db.query(SubjectScheduleModel).filter(
            SubjectScheduleModel.subject_id == subject_id,
            SubjectScheduleModel.teacher_id == getattr(current_user, 'id', None)
        ).all()

    is_admin = user_role == 'admin'
    is_assigned_teacher = len(teacher_schedules) > 0

    if not (is_admin or is_assigned_teacher):
        raise HTTPException(status_code=403, detail='Not authorized to view students for this subject')

    # Determine scope
    teacher_is_global = any(s.classroom_id is None for s in teacher_schedules) if is_assigned_teacher and not is_admin else False

    # IDs from direct enrollments
    enrolled_query = db.query(SubjectStudentModel.student_id).filter(SubjectStudentModel.subject_id == subject_id)
    enrolled_ids = [r[0] for r in enrolled_query.all()]

    # Classroom ids assigned to the subject (by admin)
    subj_classroom_ids = [r[0] for r in db.query(ClassroomSubjectModel.classroom_id).filter(ClassroomSubjectModel.subject_id == subject_id).all()]

    # Build student ID set based on scope
    student_id_set = set()

    if is_admin or teacher_is_global:
        # Admin or global teacher: include all enrolled students + students in subject classrooms
        student_id_set.update(enrolled_ids)

        if subj_classroom_ids:
            classroom_student_ids = [r[0] for r in db.query(ClassroomStudentModel.student_id).filter(
                ClassroomStudentModel.classroom_id.in_(subj_classroom_ids),
                ClassroomStudentModel.is_active == True
            ).all()]
            student_id_set.update(classroom_student_ids)
    else:
        # Teacher assigned to specific classrooms only: compute allowed classroom ids
        allowed_classroom_ids = [s.classroom_id for s in teacher_schedules if s.classroom_id is not None]

        # Include direct enrollments only if the student's active classroom is in allowed_classroom_ids
        for sid in enrolled_ids:
            cs = db.query(ClassroomStudentModel).filter(
                ClassroomStudentModel.student_id == sid,
                ClassroomStudentModel.is_active == True
            ).first()
            if cs and cs.classroom_id in allowed_classroom_ids:
                student_id_set.add(sid)

        # Include students who are in classrooms assigned to the subject AND that the teacher is responsible for
        # i.e., intersection of subj_classroom_ids and allowed_classroom_ids
        classroom_ids = list(set(subj_classroom_ids).intersection(set(allowed_classroom_ids)))
        if classroom_ids:
            classroom_student_ids = [r[0] for r in db.query(ClassroomStudentModel.student_id).filter(
                ClassroomStudentModel.classroom_id.in_(classroom_ids),
                ClassroomStudentModel.is_active == True
            ).all()]
            student_id_set.update(classroom_student_ids)

    if not student_id_set:
        return []

    # Fetch student user rows
    student_rows = db.query(UserModel).filter(UserModel.id.in_(list(student_id_set))).all()

    # Build response including active classroom info if available
    result = []
    for student in student_rows:
        classroom_info = None
        classroom_student = db.query(ClassroomStudentModel).filter(
            ClassroomStudentModel.student_id == student.id,
            ClassroomStudentModel.is_active == True
        ).first()
        if classroom_student:
            classroom = db.query(ClassroomModel).filter(ClassroomModel.id == classroom_student.classroom_id).first()
            if classroom:
                classroom_info = {'id': classroom.id, 'name': classroom.name}

        result.append({
            'id': student.id,
            'username': student.username,
            'full_name': student.full_name,
            'email': student.email,
            'role': student.role,
            'school_id': student.school_id,
            'grade_level': student.grade_level,
            'is_active': student.is_active,
            'classroom': classroom_info
        })

    return result
    
    # Build response with classroom info for each student
    result = []
    for student in student_rows:
        # Get student's active classroom
        classroom_student = db.query(ClassroomStudentModel).filter(
            ClassroomStudentModel.student_id == student.id,
            ClassroomStudentModel.is_active == True
        ).first()
        
        classroom_info = None
        if classroom_student:
            classroom = db.query(ClassroomModel).filter(
                ClassroomModel.id == classroom_student.classroom_id
            ).first()
            if classroom:
                classroom_info = {
                    'id': classroom.id,
                    'name': classroom.name
                }
        
        result.append({
            'id': student.id,
            'username': student.username,
            'full_name': student.full_name,
            'email': student.email,
            'role': student.role,
            'school_id': student.school_id,
            'grade_level': student.grade_level,
            'is_active': student.is_active,
            'classroom': classroom_info
        })
    
    return result


@router.get("/available-students/{subject_id}")
def get_available_students_for_enrollment(subject_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Get all students available for enrollment (not yet enrolled) grouped by grade_level"""
    subj = db.query(SubjectModel).filter(SubjectModel.id == subject_id).first()
    if not subj:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    # Check if user is admin or assigned teacher via SubjectSchedule
    is_admin = getattr(current_user, 'role', None) == 'admin'
    is_assigned_teacher = db.query(SubjectScheduleModel).filter(
        SubjectScheduleModel.subject_id == subject_id,
        SubjectScheduleModel.teacher_id == getattr(current_user, 'id', None)
    ).first() is not None
    
    if not (is_admin or is_assigned_teacher):
        raise HTTPException(status_code=403, detail='Not authorized to view students for this subject')
    
    # Get all students in same school not yet enrolled in this subject
    enrolled_student_ids = db.query(SubjectStudentModel.student_id).filter(
        SubjectStudentModel.subject_id == subject_id
    ).subquery()
    
    available_students = db.query(UserModel).filter(
        UserModel.role == 'student',
        UserModel.school_id == subj.school_id,
        UserModel.id.notin_(enrolled_student_ids),
        UserModel.is_active == True
    ).all()
    
    # Group by grade_level
    grades = {}
    for student in available_students:
        grade = student.grade_level or 'ไม่ระบุ'
        if grade not in grades:
            grades[grade] = {
                'grade_level': grade,
                'count': 0,
                'students': []
            }
        grades[grade]['students'].append({
            'id': student.id,
            'username': student.username,
            'full_name': student.full_name,
            'email': student.email,
            'grade_level': student.grade_level
        })
        grades[grade]['count'] += 1
    
    return {
        'subject_id': subject_id,
        'total_available': len(available_students),
        'grades': list(grades.values())
    }


@router.post("/{subject_id}/enroll", status_code=status.HTTP_201_CREATED)
def enroll_student(subject_id: int, student_id: int = Body(..., embed=True), db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    subj = db.query(SubjectModel).filter(SubjectModel.id == subject_id).first()
    if not subj:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    # Check if user is admin or assigned teacher via SubjectSchedule
    is_admin = getattr(current_user, 'role', None) == 'admin'
    is_assigned_teacher = db.query(SubjectScheduleModel).filter(
        SubjectScheduleModel.subject_id == subject_id,
        SubjectScheduleModel.teacher_id == getattr(current_user, 'id', None)
    ).first() is not None
    
    if not (is_admin or is_assigned_teacher):
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


@router.post("/{subject_id}/enroll_by_grade", status_code=status.HTTP_201_CREATED)
def enroll_students_by_grade(subject_id: int, grade_level: str = Body(..., embed=True), db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Enroll all students with matching grade_level to the subject"""
    subj = db.query(SubjectModel).filter(SubjectModel.id == subject_id).first()
    if not subj:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    # Check if user is admin or assigned teacher via SubjectSchedule
    is_admin = getattr(current_user, 'role', None) == 'admin'
    is_assigned_teacher = db.query(SubjectScheduleModel).filter(
        SubjectScheduleModel.subject_id == subject_id,
        SubjectScheduleModel.teacher_id == getattr(current_user, 'id', None)
    ).first() is not None
    
    if not (is_admin or is_assigned_teacher):
        raise HTTPException(status_code=403, detail='Not authorized to enroll students to this subject')
    
    # Get all students with matching grade_level in the same school
    students = db.query(UserModel).filter(
        UserModel.role == 'student',
        UserModel.grade_level == grade_level,
        UserModel.school_id == subj.school_id
    ).all()
    
    if not students:
        raise HTTPException(status_code=404, detail=f'No students found with grade_level: {grade_level}')
    
    enrolled_count = 0
    failed_count = 0
    
    for student in students:
        # Check if already enrolled
        exists = db.query(SubjectStudentModel).filter(
            SubjectStudentModel.subject_id == subject_id,
            SubjectStudentModel.student_id == student.id
        ).first()
        
        if not exists:
            rel = SubjectStudentModel(subject_id=subject_id, student_id=student.id)
            db.add(rel)
            enrolled_count += 1
        else:
            failed_count += 1
    
    db.commit()
    return {
        'detail': f'Bulk enrollment completed',
        'grade_level': grade_level,
        'enrolled_count': enrolled_count,
        'already_enrolled_count': failed_count,
        'total_students': len(students)
    }


@router.delete("/{subject_id}/enroll/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def unenroll_student(subject_id: int, student_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    subj = db.query(SubjectModel).filter(SubjectModel.id == subject_id).first()
    if not subj:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    # Check if user is admin or assigned teacher via SubjectSchedule
    is_admin = getattr(current_user, 'role', None) == 'admin'
    is_assigned_teacher = db.query(SubjectScheduleModel).filter(
        SubjectScheduleModel.subject_id == subject_id,
        SubjectScheduleModel.teacher_id == getattr(current_user, 'id', None)
    ).first() is not None
    
    if not (is_admin or is_assigned_teacher):
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
    
    # Only admin can delete, and only if ended
    if getattr(current_user, 'role', None) != 'admin':
        raise HTTPException(status_code=403, detail="Only admin can delete subjects")
    
    # Verify school ownership
    if getattr(current_user, 'school_id', None) and subj.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Cannot delete subject for different school")
    
    # Check if there are any teachers not finished (is_ended = False)
    unfinished_teachers = db.query(SubjectScheduleModel).filter(
        SubjectScheduleModel.subject_id == subject_id,
        SubjectScheduleModel.is_ended == False
    ).first()
    
    if unfinished_teachers:
        raise HTTPException(status_code=400, detail="ไม่สามารถลบได้ เนื่องจากยังมีครูที่ยังไม่ได้จบคอร์ส ต้องให้ครูทั้งหมดกดจบคอร์สก่อน")

    # Delete related records first to avoid foreign key constraint errors
    from models.attendance import Attendance as AttendanceModel
    from models.grade import Grade as GradeModel

    # Delete attendance records
    db.query(AttendanceModel).filter(AttendanceModel.subject_id == subject_id).delete()

    # Delete grade records
    db.query(GradeModel).filter(GradeModel.subject_id == subject_id).delete()

    # Delete subject schedules
    db.query(SubjectScheduleModel).filter(SubjectScheduleModel.subject_id == subject_id).delete()
    db.commit()  # Commit to ensure classroom_subjects are deleted before deleting subject

    # Delete student enrollments
    db.query(SubjectStudentModel).filter(SubjectStudentModel.subject_id == subject_id).delete()

    # Delete classroom-subject relationships
    db.query(ClassroomSubjectModel).filter(ClassroomSubjectModel.subject_id == subject_id).delete()
    db.commit()  # Commit to ensure classroom_subjects are deleted before deleting subject

    # Now delete the subject
    db.delete(subj)
    db.commit()
    return


@router.patch("/{subject_id}/end", response_model=Subject)
def end_subject(subject_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    subj = db.query(SubjectModel).filter(SubjectModel.id == subject_id).first()
    if not subj:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    # Admin can end any subject, teacher can only end subjects they are assigned to
    user_role = getattr(current_user, 'role', None)
    if user_role == 'admin':
        # Admin can end any subject in their school
        if getattr(current_user, 'school_id', None) and subj.school_id != current_user.school_id:
            raise HTTPException(status_code=403, detail="Cannot end subject for different school")
    else:
        # Teacher can only end subjects they are assigned to
        # Check if teacher is assigned to this subject
        assigned = db.query(SubjectScheduleModel).filter(
            SubjectScheduleModel.subject_id == subject_id,
            SubjectScheduleModel.teacher_id == current_user.id
        ).first()
        if not assigned:
            raise HTTPException(status_code=403, detail="Not authorized to end this subject")
    
    subj.is_ended = True
    db.commit()
    db.refresh(subj)
    return subj


@router.patch("/{subject_id}/unend", response_model=Subject)
def unend_subject(subject_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    subj = db.query(SubjectModel).filter(SubjectModel.id == subject_id).first()
    if not subj:
        raise HTTPException(status_code=404, detail="Subject not found")
    # only assigned teacher can unend
    if subj.teacher_id != getattr(current_user, 'id', None):
        raise HTTPException(status_code=403, detail="Not authorized to unend this subject")
    subj.is_ended = False
    db.commit()
    db.refresh(subj)
    return subj


# ===== Classroom Subject Management Endpoints =====

@router.post("/{subject_id}/assign-classroom", status_code=status.HTTP_201_CREATED)
def assign_classroom_to_subject(subject_id: int, classroom_id: int = Body(..., embed=True), db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Assign a classroom to a subject and auto-enroll all students in that classroom"""
    # Only admin can assign classrooms
    if getattr(current_user, 'role', None) != 'admin':
        raise HTTPException(status_code=403, detail="Only admin can assign classrooms to subjects")
    
    # Verify subject exists
    subject = db.query(SubjectModel).filter(SubjectModel.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    # Verify classroom exists
    classroom = db.query(ClassroomModel).filter(ClassroomModel.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found")
    
    # Check if already assigned
    existing = db.query(ClassroomSubjectModel).filter(
        ClassroomSubjectModel.subject_id == subject_id,
        ClassroomSubjectModel.classroom_id == classroom_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Classroom already assigned to this subject")
    
    # Create assignment
    assignment = ClassroomSubjectModel(subject_id=subject_id, classroom_id=classroom_id)
    db.add(assignment)
    db.commit()
    
    # Auto-enroll all active students in this classroom
    students = db.query(ClassroomStudentModel).filter(
        ClassroomStudentModel.classroom_id == classroom_id,
        ClassroomStudentModel.is_active == True
    ).all()
    
    enrolled_count = 0
    for cs in students:
        # Check if already enrolled in subject
        existing_enrollment = db.query(SubjectStudentModel).filter(
            SubjectStudentModel.subject_id == subject_id,
            SubjectStudentModel.student_id == cs.student_id
        ).first()
        
        if not existing_enrollment:
            enrollment = SubjectStudentModel(subject_id=subject_id, student_id=cs.student_id)
            db.add(enrollment)
            enrolled_count += 1
    
    db.commit()
    
    return {
        'detail': 'Classroom assigned successfully',
        'subject_id': subject_id,
        'classroom_id': classroom_id,
        'students_enrolled': enrolled_count
    }


@router.delete("/{subject_id}/unassign-classroom/{classroom_id}", status_code=status.HTTP_204_NO_CONTENT)
def unassign_classroom_from_subject(subject_id: int, classroom_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Unassign a classroom from a subject (does not unenroll students)"""
    # Only admin can unassign
    if getattr(current_user, 'role', None) != 'admin':
        raise HTTPException(status_code=403, detail="Only admin can unassign classrooms from subjects")
    
    assignment = db.query(ClassroomSubjectModel).filter(
        ClassroomSubjectModel.subject_id == subject_id,
        ClassroomSubjectModel.classroom_id == classroom_id
    ).first()
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Classroom not assigned to this subject")
    
    db.delete(assignment)
    db.commit()
    return


@router.get("/{subject_id}/classrooms")
def get_subject_classrooms(subject_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Get all classrooms assigned to a subject"""
    subject = db.query(SubjectModel).filter(SubjectModel.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    # Only admin or the assigned teacher can view
    if getattr(current_user, 'role', None) != 'admin' and subject.teacher_id != getattr(current_user, 'id', None):
        raise HTTPException(status_code=403, detail="Not authorized to view classrooms for this subject")
    
    classrooms = db.query(ClassroomModel).join(
        ClassroomSubjectModel, ClassroomSubjectModel.classroom_id == ClassroomModel.id
    ).filter(ClassroomSubjectModel.subject_id == subject_id).all()
    
    return {
        'subject_id': subject_id,
        'classrooms': classrooms
    }


@router.get("/school/{school_id}/all")
def get_all_subjects_by_school(school_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Get all subjects for a school with their classroom and teacher info"""
    # Only admin of that school can access
    if getattr(current_user, 'role', None) != 'admin' or int(getattr(current_user, 'school_id', None)) != int(school_id):
        raise HTTPException(status_code=403, detail="Not authorized to view subjects for this school")
    
    subjects = db.query(SubjectModel).filter(SubjectModel.school_id == school_id).all()
    
    result = []
    for subj in subjects:
        # Count classrooms
        classroom_count = db.query(ClassroomSubjectModel).filter(
            ClassroomSubjectModel.subject_id == subj.id
        ).count()
        
        # Count enrolled students
        student_count = db.query(SubjectStudentModel).filter(
            SubjectStudentModel.subject_id == subj.id
        ).count()
        
        # Get teacher info - now multiple teachers possible
        teachers_info = []
        subject_schedules = db.query(SubjectScheduleModel).filter(SubjectScheduleModel.subject_id == subj.id).all()
        for schedule in subject_schedules:
            teacher = db.query(UserModel).filter(UserModel.id == schedule.teacher_id).first()
            teacher_name = teacher.full_name or teacher.username if teacher else "Unknown"
            
            classroom_name = None
            if schedule.classroom_id:
                classroom = db.query(ClassroomModel).filter(ClassroomModel.id == schedule.classroom_id).first()
                classroom_name = classroom.name if classroom else None
            
            teachers_info.append({
                'id': schedule.teacher_id,
                'name': teacher_name,
                'classroom_id': schedule.classroom_id,
                'classroom_name': classroom_name
            })
        
        # For backward compatibility, keep teacher_name as the first teacher or empty
        teacher_name = teachers_info[0]['name'] if teachers_info else None
        
        result.append({
            'id': subj.id,
            'name': subj.name,
            'code': subj.code,
            'subject_type': subj.subject_type,
            'credits': getattr(subj, 'credits', None),
            'activity_percentage': getattr(subj, 'activity_percentage', None),
            'teacher_id': subj.teacher_id,  # Keep for backward compatibility
            'teacher_name': teacher_name,  # Keep for backward compatibility
            'teachers': teachers_info,  # New field with all teachers
            'teacher_count': len(teachers_info),  # Number of teachers
            'classroom_count': classroom_count,
            'student_count': student_count,
            'is_ended': subj.is_ended,
            'created_at': subj.created_at
        })
    
    return result


# Subject Teachers Management
@router.get("/{subject_id}/teachers", response_model=List[SubjectTeacher])
def get_subject_teachers(subject_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Get all teachers assigned to a subject (accessible to admin and teachers)"""
    # Both admin and teachers can view subject teachers
    user_role = getattr(current_user, 'role', None)
    if user_role not in ['admin', 'teacher']:
        raise HTTPException(status_code=403, detail="Not authorized to view subject teachers")
    
    # Verify subject exists and belongs to user's school
    subject = db.query(SubjectModel).filter(SubjectModel.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    if getattr(current_user, 'school_id', None) and subject.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Cannot view teachers for subject in different school")
    
    # Get all subject schedules (which contain teacher assignments)
    schedules = db.query(SubjectScheduleModel).filter(
        SubjectScheduleModel.subject_id == subject_id
    ).all()
    
    result = []
    for schedule in schedules:
        # Get teacher info
        teacher = db.query(UserModel).filter(UserModel.id == schedule.teacher_id).first()
        teacher_name = teacher.full_name or teacher.username if teacher else "Unknown"
        
        # Get classroom info if specific classroom
        classroom_name = None
        if schedule.classroom_id:
            classroom = db.query(ClassroomModel).filter(ClassroomModel.id == schedule.classroom_id).first()
            classroom_name = classroom.name if classroom else "Unknown"
        
        result.append({
            'id': schedule.id,
            'subject_id': subject_id,
            'teacher_id': schedule.teacher_id,
            'teacher_name': teacher_name,
            'classroom_id': schedule.classroom_id,
            'classroom_name': classroom_name,
            'is_ended': schedule.is_ended,
            'created_at': schedule.created_at,
            'updated_at': schedule.updated_at
        })
    
    return result


@router.post("/{subject_id}/teachers", response_model=SubjectTeacher)
def add_subject_teacher(subject_id: int, teacher_data: SubjectTeacherCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Add a teacher to a subject"""
    # Only admin can assign teachers
    if getattr(current_user, 'role', None) != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized to assign teachers to subjects")
    
    # Verify subject exists and belongs to user's school
    subject = db.query(SubjectModel).filter(SubjectModel.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    if getattr(current_user, 'school_id', None) and subject.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Cannot assign teachers to subject in different school")
    
    # Verify teacher exists and is a teacher in the same school
    teacher = db.query(UserModel).filter(
        UserModel.id == teacher_data.teacher_id,
        UserModel.role == 'teacher'
    ).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    
    if teacher.school_id != subject.school_id:
        raise HTTPException(status_code=400, detail="Teacher must be from the same school")
    
    # Verify classroom exists if specified
    if teacher_data.classroom_id:
        classroom = db.query(ClassroomModel).filter(
            ClassroomModel.id == teacher_data.classroom_id,
            ClassroomModel.school_id == subject.school_id
        ).first()
        if not classroom:
            raise HTTPException(status_code=404, detail="Classroom not found")

    # Prevent mixing assignment types: cannot add global teacher if specific-classroom teachers exist
    if teacher_data.classroom_id is None:
        conflict = db.query(SubjectScheduleModel).filter(
            SubjectScheduleModel.subject_id == subject_id,
            SubjectScheduleModel.classroom_id != None
        ).first()
        if conflict:
            raise HTTPException(status_code=400, detail="มีการมอบหมายครูที่ระบุชั้นเรียนอยู่แล้ว กรุณาลบก่อนเพิ่มครูผู้สอนทุกชั้นเรียน")
    else:
        # Adding a classroom-specific teacher -> cannot if a global teacher exists
        conflict = db.query(SubjectScheduleModel).filter(
            SubjectScheduleModel.subject_id == subject_id,
            SubjectScheduleModel.classroom_id == None
        ).first()
        if conflict:
            raise HTTPException(status_code=400, detail="มีครูที่สอนทุกชั้นเรียนอยู่ กรุณาลบก่อนเพิ่มครูที่สอนเฉพาะชั้นเรียน")

    # Check if this teacher-classroom combination already exists for this subject
    existing = db.query(SubjectScheduleModel).filter(
        SubjectScheduleModel.subject_id == subject_id,
        SubjectScheduleModel.teacher_id == teacher_data.teacher_id,
        SubjectScheduleModel.classroom_id == teacher_data.classroom_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="This teacher is already assigned to this subject/classroom combination")
    
    # Create new subject schedule (without time details since this is just teacher assignment)
    new_schedule = SubjectScheduleModel(
        subject_id=subject_id,
        teacher_id=teacher_data.teacher_id,
        classroom_id=teacher_data.classroom_id
    )
    
    db.add(new_schedule)
    db.commit()
    db.refresh(new_schedule)
    
    # Return formatted response
    teacher_name = teacher.full_name or teacher.username
    classroom_name = None
    if teacher_data.classroom_id:
        classroom = db.query(ClassroomModel).filter(ClassroomModel.id == teacher_data.classroom_id).first()
        classroom_name = classroom.name if classroom else None
    
    return {
        'id': new_schedule.id,
        'subject_id': subject_id,
        'teacher_id': teacher_data.teacher_id,
        'teacher_name': teacher_name,
        'classroom_id': teacher_data.classroom_id,
        'classroom_name': classroom_name
    }


@router.delete("/{subject_id}/teachers/{teacher_id}")
def remove_subject_teacher(subject_id: int, teacher_id: int, classroom_id: int = None, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Remove a teacher from a subject"""
    # Only admin can remove teachers
    if getattr(current_user, 'role', None) != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized to remove teachers from subjects")
    
    # Verify subject exists and belongs to user's school
    subject = db.query(SubjectModel).filter(SubjectModel.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    if getattr(current_user, 'school_id', None) and subject.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Cannot remove teachers from subject in different school")
    
    # Find and delete the subject schedule
    query = db.query(SubjectScheduleModel).filter(
        SubjectScheduleModel.subject_id == subject_id,
        SubjectScheduleModel.teacher_id == teacher_id
    )
    
    if classroom_id is not None:
        query = query.filter(SubjectScheduleModel.classroom_id == classroom_id)
    
    schedule = query.first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Teacher assignment not found")
    
    db.delete(schedule)
    db.commit()
    
    return {"message": "Teacher removed from subject successfully"}


# -------------------------
# Schedule endpoints
# -------------------------
@router.get('/schedules/teacher/{teacher_id}', response_model=List[SubjectScheduleSchema])
def get_teacher_schedule(teacher_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Return schedule entries for a teacher using admin-provided assignments.
    Admins may fetch any teacher; teachers may fetch only their own schedule."""
    # Authorization
    if getattr(current_user, 'role', None) != 'admin' and getattr(current_user, 'id', None) != int(teacher_id):
        raise HTTPException(status_code=403, detail='Not authorized to view this teacher\'s schedule')

    schedules = db.query(SubjectScheduleModel).filter(SubjectScheduleModel.teacher_id == teacher_id).all()

    result = []
    for s in schedules:
        subject = db.query(SubjectModel).filter(SubjectModel.id == s.subject_id).first()
        teacher = db.query(UserModel).filter(UserModel.id == s.teacher_id).first()
        teacher_name = teacher.full_name or teacher.username if teacher else 'Unknown'

        classroom_name = None
        if s.classroom_id:
            classroom = db.query(ClassroomModel).filter(ClassroomModel.id == s.classroom_id).first()
            classroom_name = classroom.name if classroom else None

        # Prefer schedule_slot if present, otherwise use custom fields on SubjectSchedule
        day_of_week = None
        start_time = None
        end_time = None
        schedule_slot_id = None
        if s.schedule_slot_id and s.schedule_slot:
            schedule_slot_id = s.schedule_slot_id
            day_of_week = s.schedule_slot.day_of_week
            start_time = s.schedule_slot.start_time
            end_time = s.schedule_slot.end_time
        else:
            day_of_week = s.day_of_week
            start_time = s.start_time
            end_time = s.end_time

        result.append({
            'id': s.id,
            'subject_id': s.subject_id,
            'subject_name': subject.name if subject else None,
            'subject_code': subject.code if subject else None,
            'teacher_id': s.teacher_id,
            'teacher_name': teacher_name,
            'classroom_id': s.classroom_id,
            'classroom_name': classroom_name,
            'day_of_week': day_of_week,
            'start_time': start_time,
            'end_time': end_time,
            'schedule_slot_id': schedule_slot_id
        })

    # Optional: sort by day_of_week then start_time for predictable order
    def sort_key(item):
        dow = item['day_of_week'] if item['day_of_week'] is not None else ''
        st = item['start_time'] if item['start_time'] is not None else ''
        return (str(dow), str(st))

    result.sort(key=sort_key)
    return result


@router.get('/schedules/student/{student_id}', response_model=List[StudentScheduleResponse])
def get_student_schedule(student_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Return schedule entries for a student based on their enrollments and classroom assignments.
    Admins may fetch any student; students may fetch their own schedule. Teachers are allowed if they teach the student's classroom."""
    # Authorization
    is_admin = getattr(current_user, 'role', None) == 'admin'
    if not is_admin and getattr(current_user, 'id', None) != int(student_id):
        # Allow teacher if they are responsible for student's active classroom
        if getattr(current_user, 'role', None) == 'teacher':
            # find student's active classroom
            cs = db.query(ClassroomStudentModel).filter(
                ClassroomStudentModel.student_id == student_id,
                ClassroomStudentModel.is_active == True
            ).first()
            if not cs:
                raise HTTPException(status_code=403, detail='Not authorized to view this student\'s schedule')
            # check if teacher teaches that classroom
            assigned = db.query(SubjectScheduleModel).filter(
                SubjectScheduleModel.classroom_id == cs.classroom_id,
                SubjectScheduleModel.teacher_id == current_user.id
            ).first()
            if not assigned:
                raise HTTPException(status_code=403, detail='Not authorized to view this student\'s schedule')
        else:
            raise HTTPException(status_code=403, detail='Not authorized to view this student\'s schedule')

    # Determine student's active classroom
    classroom_student = db.query(ClassroomStudentModel).filter(
        ClassroomStudentModel.student_id == student_id,
        ClassroomStudentModel.is_active == True
    ).first()

    classroom_id = classroom_student.classroom_id if classroom_student else None

    # Subjects the student is directly enrolled in
    enrolled_subject_ids = [r[0] for r in db.query(SubjectStudentModel.subject_id).filter(SubjectStudentModel.student_id == student_id).all()]

    # Subjects assigned to the student's classroom
    classroom_subject_ids = []
    if classroom_id:
        classroom_subject_ids = [r[0] for r in db.query(ClassroomSubjectModel.subject_id).filter(ClassroomSubjectModel.classroom_id == classroom_id).all()]

    subject_ids = set(enrolled_subject_ids) | set(classroom_subject_ids)

    if not subject_ids:
        return []

    # Find schedules for these subjects that either are global (classroom_id is NULL) or target the student's classroom
    schedules = db.query(SubjectScheduleModel).filter(
        SubjectScheduleModel.subject_id.in_(list(subject_ids)),
        ((SubjectScheduleModel.classroom_id == None) | (SubjectScheduleModel.classroom_id == classroom_id))
    ).all()

    result = []
    for s in schedules:
        subject = db.query(SubjectModel).filter(SubjectModel.id == s.subject_id).first()
        teacher = db.query(UserModel).filter(UserModel.id == s.teacher_id).first()
        teacher_name = teacher.full_name or teacher.username if teacher else 'Unknown'

        # Prefer schedule_slot if present, otherwise use custom fields on SubjectSchedule
        if s.schedule_slot_id and s.schedule_slot:
            day_of_week = s.schedule_slot.day_of_week
            start_time = s.schedule_slot.start_time
            end_time = s.schedule_slot.end_time
        else:
            day_of_week = s.day_of_week
            start_time = s.start_time
            end_time = s.end_time

        result.append({
            'id': s.id,
            'subject_id': s.subject_id,
            'subject_name': subject.name if subject else None,
            'subject_code': subject.code if subject else None,
            'teacher_name': teacher_name,
            'day_of_week': day_of_week,
            'start_time': start_time,
            'end_time': end_time
        })

    # Sort by day and time
    def sort_key2(item):
        dow = item['day_of_week'] if item['day_of_week'] is not None else ''
        st = item['start_time'] if item['start_time'] is not None else ''
        return (str(dow), str(st))

    result.sort(key=sort_key2)
    return result


# Teacher-specific end course endpoints
@router.patch("/{subject_id}/teachers/{schedule_id}/end", response_model=SubjectTeacher)
def end_teacher_course(subject_id: int, schedule_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Mark course as ended for a specific teacher (used by teachers)"""
    # Get the schedule
    schedule = db.query(SubjectScheduleModel).filter(
        SubjectScheduleModel.id == schedule_id,
        SubjectScheduleModel.subject_id == subject_id
    ).first()
    
    if not schedule:
        raise HTTPException(status_code=404, detail="Teacher assignment not found")
    
    # Only the assigned teacher or admin can end the course for that teacher
    user_role = getattr(current_user, 'role', None)
    user_id = getattr(current_user, 'id', None)
    
    if user_role != 'admin' and schedule.teacher_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to mark course as ended for this teacher")
    
    schedule.is_ended = True
    db.commit()
    db.refresh(schedule)
    
    # Get teacher info
    teacher = db.query(UserModel).filter(UserModel.id == schedule.teacher_id).first()
    teacher_name = teacher.full_name or teacher.username if teacher else "Unknown"
    
    classroom_name = None
    if schedule.classroom_id:
        classroom = db.query(ClassroomModel).filter(ClassroomModel.id == schedule.classroom_id).first()
        classroom_name = classroom.name if classroom else "Unknown"
    
    return {
        'id': schedule.id,
        'subject_id': subject_id,
        'teacher_id': schedule.teacher_id,
        'teacher_name': teacher_name,
        'classroom_id': schedule.classroom_id,
        'classroom_name': classroom_name,
        'is_ended': schedule.is_ended,
        'created_at': schedule.created_at,
        'updated_at': schedule.updated_at
    }


@router.patch("/{subject_id}/teachers/{schedule_id}/unend", response_model=SubjectTeacher)
def unend_teacher_course(subject_id: int, schedule_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Mark course as not ended for a specific teacher (used by admins)"""
    # Only admin can unend
    if getattr(current_user, 'role', None) != 'admin':
        raise HTTPException(status_code=403, detail="Only admin can unend teacher courses")
    
    # Get the schedule
    schedule = db.query(SubjectScheduleModel).filter(
        SubjectScheduleModel.id == schedule_id,
        SubjectScheduleModel.subject_id == subject_id
    ).first()
    
    if not schedule:
        raise HTTPException(status_code=404, detail="Teacher assignment not found")
    
    schedule.is_ended = False
    db.commit()
    db.refresh(schedule)
    
    # Get teacher info
    teacher = db.query(UserModel).filter(UserModel.id == schedule.teacher_id).first()
    teacher_name = teacher.full_name or teacher.username if teacher else "Unknown"
    
    classroom_name = None
    if schedule.classroom_id:
        classroom = db.query(ClassroomModel).filter(ClassroomModel.id == schedule.classroom_id).first()
        classroom_name = classroom.name if classroom else "Unknown"
    
    return {
        'id': schedule.id,
        'subject_id': subject_id,
        'teacher_id': schedule.teacher_id,
        'teacher_name': teacher_name,
        'classroom_id': schedule.classroom_id,
        'classroom_name': classroom_name,
        'is_ended': schedule.is_ended,
        'created_at': schedule.created_at,
        'updated_at': schedule.updated_at
    }
