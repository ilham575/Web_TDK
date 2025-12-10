from fastapi import APIRouter, HTTPException, Depends, status, Body
from sqlalchemy.orm import Session
from typing import List

from schemas.subject import Subject, SubjectCreate
from models.subject import Subject as SubjectModel
from models.subject_student import SubjectStudent as SubjectStudentModel
from models.classroom_subject import ClassroomSubject as ClassroomSubjectModel
from models.user import User as UserModel
from models.classroom import Classroom as ClassroomModel, ClassroomStudent as ClassroomStudentModel
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


@router.get("/{subject_id}/students")
def get_subject_students(subject_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    # list students enrolled in subject
    subj = db.query(SubjectModel).filter(SubjectModel.id == subject_id).first()
    if not subj:
        raise HTTPException(status_code=404, detail="Subject not found")
    # only admin or assigned teacher can view
    if getattr(current_user, 'role', None) != 'admin' and subj.teacher_id != getattr(current_user, 'id', None):
        raise HTTPException(status_code=403, detail='Not authorized to view students for this subject')
    
    # join subject_students -> users and include classroom info
    student_rows = db.query(UserModel).join(
        SubjectStudentModel, SubjectStudentModel.student_id == UserModel.id
    ).filter(SubjectStudentModel.subject_id == subject_id).all()
    
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
    
    # only admin or assigned teacher can view
    if getattr(current_user, 'role', None) != 'admin' and subj.teacher_id != getattr(current_user, 'id', None):
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


@router.post("/{subject_id}/enroll_by_grade", status_code=status.HTTP_201_CREATED)
def enroll_students_by_grade(subject_id: int, grade_level: str = Body(..., embed=True), db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Enroll all students with matching grade_level to the subject"""
    subj = db.query(SubjectModel).filter(SubjectModel.id == subject_id).first()
    if not subj:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    # only admin or teacher assigned to subject can enroll
    if getattr(current_user, 'role', None) != 'admin' and subj.teacher_id != getattr(current_user, 'id', None):
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
    # only admin can delete, and only if ended
    if getattr(current_user, 'role', None) != 'admin':
        raise HTTPException(status_code=403, detail="Only admin can delete subjects")
    if not subj.is_ended:
        raise HTTPException(status_code=400, detail="Subject must be ended before deletion")

    # Delete related records first to avoid foreign key constraint errors
    from models.attendance import Attendance as AttendanceModel
    from models.grade import Grade as GradeModel
    from models.schedule import SubjectSchedule as SubjectScheduleModel

    # Delete attendance records
    db.query(AttendanceModel).filter(AttendanceModel.subject_id == subject_id).delete()

    # Delete grade records
    db.query(GradeModel).filter(GradeModel.subject_id == subject_id).delete()

    # Delete subject schedules
    db.query(SubjectScheduleModel).filter(SubjectScheduleModel.subject_id == subject_id).delete()

    # Delete student enrollments
    db.query(SubjectStudentModel).filter(SubjectStudentModel.subject_id == subject_id).delete()

    # Now delete the subject
    db.delete(subj)
    db.commit()
    return


@router.patch("/{subject_id}/end", response_model=Subject)
def end_subject(subject_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    subj = db.query(SubjectModel).filter(SubjectModel.id == subject_id).first()
    if not subj:
        raise HTTPException(status_code=404, detail="Subject not found")
    # only assigned teacher can end
    if subj.teacher_id != getattr(current_user, 'id', None):
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
        
        # Get teacher info
        teacher_name = None
        if subj.teacher_id:
            teacher = db.query(UserModel).filter(UserModel.id == subj.teacher_id).first()
            if teacher:
                teacher_name = teacher.full_name or teacher.username
        
        result.append({
            'id': subj.id,
            'name': subj.name,
            'code': subj.code,
            'subject_type': subj.subject_type,
            'credits': getattr(subj, 'credits', None),
            'activity_percentage': getattr(subj, 'activity_percentage', None),
            'teacher_id': subj.teacher_id,
            'teacher_name': teacher_name,
            'classroom_count': classroom_count,
            'student_count': student_count,
            'is_ended': subj.is_ended,
            'created_at': subj.created_at
        })
    
    return result

