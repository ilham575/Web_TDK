from fastapi import APIRouter, Depends, HTTPException, status
import os
import smtplib
from email.message import EmailMessage
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional
from datetime import date, datetime

from database.connection import get_db
from routers.user import get_current_user
from models.absence import Absence as AbsenceModel, AbsenceType, AbsenceStatus
from models.user import User
from models.homeroom import HomeroomTeacher
from models.announcement import Announcement as AnnouncementModel
from models.classroom import ClassroomStudent, Classroom
from models.subject import Subject
from schemas.absence import AbsenceCreate, AbsenceUpdate, AbsenceResponse

router = APIRouter(prefix="/absences", tags=["absences"])


def get_student_grade_level(db: Session, student_id: int) -> Optional[str]:
    """ดึง grade_level ของนักเรียนจาก classroom ที่ active"""
    enrollment = db.query(ClassroomStudent).join(
        Classroom, ClassroomStudent.classroom_id == Classroom.id
    ).filter(
        ClassroomStudent.student_id == student_id,
        ClassroomStudent.is_active == True,
        Classroom.is_active == True
    ).first()
    
    if enrollment:
        classroom = db.query(Classroom).filter(Classroom.id == enrollment.classroom_id).first()
        return classroom.grade_level if classroom else None
    return None


def get_student_school_id(db: Session, student_id: int) -> Optional[int]:
    """ดึง school_id ของนักเรียนจาก classroom ที่ active"""
    enrollment = db.query(ClassroomStudent).join(
        Classroom, ClassroomStudent.classroom_id == Classroom.id
    ).filter(
        ClassroomStudent.student_id == student_id,
        ClassroomStudent.is_active == True,
        Classroom.is_active == True
    ).first()
    
    if enrollment:
        classroom = db.query(Classroom).filter(Classroom.id == enrollment.classroom_id).first()
        return classroom.school_id if classroom else None
    return None


def is_homeroom_teacher_of_student(db: Session, teacher_id: int, student_id: int) -> bool:
    """ตรวจสอบว่าครูเป็นครูประจำชั้นของนักเรียนหรือไม่"""
    # ดึง grade_level และ school_id ของนักเรียน
    grade_level = get_student_grade_level(db, student_id)
    school_id = get_student_school_id(db, student_id)
    
    if not grade_level or not school_id:
        return False
    
    # ตรวจสอบว่าครูเป็นครูประจำชั้นของ grade_level นี้ในโรงเรียนเดียวกันหรือไม่
    homeroom = db.query(HomeroomTeacher).filter(
        HomeroomTeacher.teacher_id == teacher_id,
        HomeroomTeacher.grade_level == grade_level,
        HomeroomTeacher.school_id == school_id
    ).first()
    
    return homeroom is not None


def can_approve_absence(db: Session, current_user, student_id: int) -> tuple:
    """
    ตรวจสอบว่าผู้ใช้มีสิทธิ์อนุมัติการลาของนักเรียนหรือไม่
    Returns: (can_approve, role)
    """
    role = getattr(current_user, 'role', None)
    
    # Owner และ Admin สามารถอนุมัติได้เสมอ (ถ้าอยู่โรงเรียนเดียวกัน)
    if role in ['owner', 'admin']:
        student_school_id = get_student_school_id(db, student_id)
        user_school_id = getattr(current_user, 'school_id', None)
        
        if student_school_id and user_school_id and student_school_id == user_school_id:
            return True, 'admin'
        elif role == 'owner':
            return True, 'admin'
    
    # Teacher ต้องเป็นครูประจำชั้นของนักเรียนนั้น
    if role == 'teacher':
        if is_homeroom_teacher_of_student(db, current_user.id, student_id):
            return True, 'teacher'
    
    return False, None


def absence_to_response(db: Session, absence: AbsenceModel) -> dict:
    """แปลง Absence model เป็น response dict พร้อมข้อมูลเพิ่มเติม"""
    # ดึงชื่อนักเรียน
    student = db.query(User).filter(User.id == absence.student_id).first()
    student_name = student.full_name if student else None
    
    # ดึงชื่อวิชา (ถ้ามี)
    subject_name = None
    if absence.subject_id:
        subject = db.query(Subject).filter(Subject.id == absence.subject_id).first()
        subject_name = subject.name if subject else None
    
    # ดึงชื่อผู้อนุมัติ (ถ้ามี)
    approver_name = None
    if absence.approved_by:
        approver = db.query(User).filter(User.id == absence.approved_by).first()
        approver_name = approver.full_name if approver else None
    
    return {
        "id": absence.id,
        "student_id": absence.student_id,
        "student_name": student_name,
        "subject_id": absence.subject_id,
        "subject_name": subject_name,
        "absence_date": absence.absence_date,
        "absence_date_end": absence.absence_date_end,
        "days_count": absence.days_count,
        "absence_type": absence.absence_type,
        "reason": absence.reason,
        "status": absence.status,
        "approved_by": absence.approved_by,
        "approver_name": approver_name,
        "approver_role": absence.approver_role,
        "approved_at": absence.approved_at,
        "reject_reason": absence.reject_reason,
        "version": absence.version or 1,
        "created_at": absence.created_at,
        "updated_at": absence.updated_at
        ,
        "announcement_id": getattr(absence, 'announcement_id', None)
    }


@router.post('/', response_model=AbsenceResponse, status_code=status.HTTP_201_CREATED)
def create_absence(
    payload: AbsenceCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new absence/leave request for the current student."""
    if getattr(current_user, 'role', None) != 'student':
        raise HTTPException(status_code=403, detail='Only students can request absences')
    
    # Check if already exists for this date
    existing = db.query(AbsenceModel).filter(
        AbsenceModel.student_id == current_user.id,
        AbsenceModel.absence_date == payload.absence_date
    ).first()
    
    if existing:
        raise HTTPException(status_code=409, detail='Absence already exists for this date')
    
    new_absence = AbsenceModel(
        student_id=current_user.id,
        subject_id=payload.subject_id,
        absence_date=payload.absence_date,
        absence_date_end=payload.absence_date_end,
        days_count=payload.days_count or 1,
        absence_type=payload.absence_type,
        reason=payload.reason,
        status=AbsenceStatus.PENDING,
        version=1
    )
    db.add(new_absence)
    db.commit()
    db.refresh(new_absence)
    
    # Notify homeroom teacher(s) and admins via email (if SMTP is configured)
    try:
        # Find student's school/grade
        grade_level = get_student_grade_level(db, current_user.id)
        school_id = get_student_school_id(db, current_user.id)

        # Find homeroom teachers for this grade/school
        homeroom_teachers = []
        if grade_level and school_id:
            homeroom_teachers = db.query(HomeroomTeacher).filter(
                HomeroomTeacher.grade_level == grade_level,
                HomeroomTeacher.school_id == school_id
            ).all()

        # Collect recipient emails
        recipient_emails = []

        # Add homeroom teacher emails
        for h in homeroom_teachers:
            teacher = db.query(User).filter(User.id == h.teacher_id).first()
            if teacher and teacher.email:
                recipient_emails.append(teacher.email)

        if not homeroom_teachers:
            print(f'No homeroom teacher found for student {current_user.id} (grade {grade_level}, school {school_id})')

        # Also add admins in the same school
        if school_id:
            admins = db.query(User).filter(
                User.role == 'admin',
                User.school_id == school_id
            ).all()
            for a in admins:
                if a.email and a.email not in recipient_emails:
                    recipient_emails.append(a.email)

        # Send email if SMTP configured and we have recipients
        smtp_host = os.getenv('SMTP_HOST')
        smtp_port = os.getenv('SMTP_PORT')
        smtp_user = os.getenv('SMTP_USER')
        smtp_pass = os.getenv('SMTP_PASS')
        from_addr = os.getenv('EMAIL_FROM') or smtp_user

        if recipient_emails and smtp_host and smtp_user and smtp_pass:
            try:
                subject = f"คำขอลาเรียนจาก {current_user.full_name}"
                html_content = f"นักเรียน {current_user.full_name} ขออนุญาตลาเรียนในวันที่ {new_absence.absence_date}. เหตุผล: {new_absence.reason}. โปรดเข้าตรวจสอบและอนุมัติหากเหมาะสม."

                msg = EmailMessage()
                msg['Subject'] = subject
                msg['From'] = from_addr
                msg['To'] = ', '.join(recipient_emails)
                msg.set_content(html_content)

                with smtplib.SMTP(smtp_host, int(smtp_port or 25)) as smtp:
                    smtp.starttls()
                    smtp.login(smtp_user, smtp_pass)
                    smtp.send_message(msg)
                print(f'Absence email notification sent to: {recipient_emails}')
            except Exception as e:
                print('Failed to send absence email notification', e)
    except Exception as e:
        # Swallow any notification errors so absence creation still succeeds, but log it
        print('Error while preparing absence notifications', e)

    # Create a school-wide announcement for absence request (visible to teachers and admins)
    try:
        school_id = get_student_school_id(db, current_user.id)
        announcement_title = f"คำขอลาเรียนจาก {current_user.full_name}"
        announcement_content = f"นักเรียน {current_user.full_name} ขออนุญาตลาเรียนในวันที่ {new_absence.absence_date}. เหตุผล: {new_absence.reason or 'ไม่ได้ระบุ'}"
        ann = AnnouncementModel(
            title=announcement_title,
            content=announcement_content,
            author_id=current_user.id,
            school_id=school_id,
            is_published=True
        )
        db.add(ann)
        db.commit()
        db.refresh(ann)
        # Save announcement id back to absence record
        try:
            new_absence.announcement_id = ann.id
            db.add(new_absence)
            db.commit()
            db.refresh(new_absence)
        except Exception as e:
            db.rollback()
            print('Failed to save announcement_id to absence', e)
    except Exception as e:
        print('Failed to create absence announcement', e)
    
    return absence_to_response(db, new_absence)


@router.get('/', response_model=List[AbsenceResponse])
def list_absences(
    student_id: int = None,
    status_filter: str = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    List absences. 
    - Students can only see their own
    - Teachers (homeroom) can see students in their grade level
    - Admins can see all in their school
    """
    query = db.query(AbsenceModel)
    role = getattr(current_user, 'role', None)
    user_school_id = getattr(current_user, 'school_id', None)
    
    # If student, filter to own absences
    if role == 'student':
        query = query.filter(AbsenceModel.student_id == current_user.id)
    elif role == 'teacher':
        # Teacher sees absences from students in their homeroom grade level
        homeroom = db.query(HomeroomTeacher).filter(
            HomeroomTeacher.teacher_id == current_user.id
        ).first()
        
        if homeroom:
            # ดึงรายชื่อนักเรียนในชั้นเรียนที่ครูประจำ
            student_ids = db.query(ClassroomStudent.student_id).join(
                Classroom, ClassroomStudent.classroom_id == Classroom.id
            ).filter(
                Classroom.grade_level == homeroom.grade_level,
                Classroom.school_id == homeroom.school_id,
                ClassroomStudent.is_active == True
            ).all()
            student_ids = [s[0] for s in student_ids]
            
            if student_ids:
                query = query.filter(AbsenceModel.student_id.in_(student_ids))
            else:
                # No students, return empty
                return []
        else:
            # Teacher is not a homeroom teacher, return empty
            return []
    elif role in ['admin', 'owner']:
        # Admin sees all absences in their school
        if user_school_id and role == 'admin':
            # ดึงรายชื่อนักเรียนในโรงเรียน
            student_ids = db.query(ClassroomStudent.student_id).join(
                Classroom, ClassroomStudent.classroom_id == Classroom.id
            ).filter(
                Classroom.school_id == user_school_id
            ).distinct().all()
            student_ids = [s[0] for s in student_ids]
            
            if student_ids:
                query = query.filter(AbsenceModel.student_id.in_(student_ids))
        # Owner can see all (no additional filter)
    
    # Filter by specific student_id if provided
    if student_id is not None and role != 'student':
        query = query.filter(AbsenceModel.student_id == student_id)
    
    # Filter by status
    if status_filter is not None:
        try:
            status_enum = AbsenceStatus(status_filter)
            query = query.filter(AbsenceModel.status == status_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail='Invalid status value')
    
    absences = query.order_by(AbsenceModel.absence_date.desc()).all()
    
    return [absence_to_response(db, a) for a in absences]


@router.get('/{absence_id}', response_model=AbsenceResponse)
def get_absence(
    absence_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get a single absence record."""
    absence = db.query(AbsenceModel).filter(AbsenceModel.id == absence_id).first()
    
    if not absence:
        raise HTTPException(status_code=404, detail='Absence not found')
    
    role = getattr(current_user, 'role', None)
    
    # Students can only view their own absences
    if role == 'student' and absence.student_id != current_user.id:
        raise HTTPException(status_code=403, detail='Not authorized to view this absence')
    
    # Teachers can only view absences of students in their homeroom
    if role == 'teacher':
        if not is_homeroom_teacher_of_student(db, current_user.id, absence.student_id):
            raise HTTPException(status_code=403, detail='Not authorized to view this absence')
    
    return absence_to_response(db, absence)


@router.put('/{absence_id}', response_model=AbsenceResponse)
def update_absence(
    absence_id: int,
    payload: AbsenceUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Update an absence record.
    - Students can only update their own pending absences (not status)
    - Homeroom teachers and admins can approve/reject with optimistic locking
    """
    absence = db.query(AbsenceModel).filter(AbsenceModel.id == absence_id).first()
    
    if not absence:
        raise HTTPException(status_code=404, detail='Absence not found')
    
    role = getattr(current_user, 'role', None)
    
    # Students can only update their own pending or rejected absences
    if role == 'student':
        if absence.student_id != current_user.id:
            raise HTTPException(status_code=403, detail='Not authorized to update this absence')
        if absence.status not in [AbsenceStatus.PENDING, AbsenceStatus.REJECTED]:
            raise HTTPException(status_code=400, detail='Can only update pending or rejected absences')
        
        # Students cannot explicitly change status - but we reset rejected to pending when they resubmit
        if payload.status is not None and payload.status != AbsenceStatus.PENDING:
            raise HTTPException(status_code=403, detail='Students can only resubmit as pending')
        
        # Update other fields (type, reason, dates)
        if payload.absence_type is not None:
            absence.absence_type = payload.absence_type
        if payload.reason is not None:
            absence.reason = payload.reason
        
        # Reset status to pending if it was rejected
        if absence.status == AbsenceStatus.REJECTED:
            absence.status = AbsenceStatus.PENDING
            absence.approved_by = None
            absence.approved_at = None
            absence.approver_role = None
            absence.reject_reason = None
        
        # Update dates if provided (for resubmission)
        if payload.absence_date is not None:
            absence.absence_date = payload.absence_date
        if payload.absence_date_end is not None:
            absence.absence_date_end = payload.absence_date_end
        if payload.days_count is not None:
            absence.days_count = payload.days_count
        if payload.subject_id is not None or (hasattr(payload, 'subject_id') and payload.subject_id == ''):
            absence.subject_id = payload.subject_id
    
    # Handle status change (approval/rejection) - only for teachers/admins
    elif payload.status is not None:
        # Check authorization
        can_approve, approver_role = can_approve_absence(db, current_user, absence.student_id)
        
        if not can_approve:
            raise HTTPException(
                status_code=403, 
                detail='ไม่มีสิทธิ์อนุมัติการลานี้ (ต้องเป็นครูประจำชั้นหรือแอดมินประจำโรงเรียนเท่านั้น)'
            )
        
        # Check if already processed
        if absence.status != AbsenceStatus.PENDING:
            raise HTTPException(
                status_code=409,
                detail=f'การลานี้ถูกดำเนินการไปแล้ว (สถานะ: {absence.status.value})'
            )
        
        # Optimistic locking: check version
        if payload.version is not None and payload.version != (absence.version or 1):
            raise HTTPException(
                status_code=409,
                detail='ข้อมูลถูกแก้ไขโดยผู้อื่นไปแล้ว กรุณารีเฟรชหน้าและลองใหม่อีกครั้ง'
            )
        
        # Update status with approval info
        absence.status = payload.status
        absence.approved_by = current_user.id
        absence.approved_at = datetime.now()
        absence.approver_role = approver_role
        
        # Increment version for optimistic locking
        absence.version = (absence.version or 1) + 1
        
        # Handle rejection reason
        if payload.status == AbsenceStatus.REJECTED:
            if not payload.reject_reason:
                raise HTTPException(status_code=400, detail='กรุณาระบุเหตุผลการปฏิเสธ')
            absence.reject_reason = payload.reject_reason

        # If approved, delete the associated announcement so it's not visible anymore
        if payload.status == AbsenceStatus.APPROVED and getattr(absence, 'announcement_id', None):
            try:
                ann = db.query(AnnouncementModel).filter(AnnouncementModel.id == absence.announcement_id).first()
                if ann:
                    db.delete(ann)
                    absence.announcement_id = None
            except Exception as e:
                print('Failed to delete associated announcement', e)
    
    # Update other fields if provided
    if payload.absence_type is not None:
        absence.absence_type = payload.absence_type
    if payload.reason is not None:
        absence.reason = payload.reason
    
    try:
        db.commit()
        db.refresh(absence)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f'Database error: {str(e)}')
    
    return absence_to_response(db, absence)


@router.delete('/{absence_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_absence(
    absence_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Delete an absence record. Students can only delete their own pending absences."""
    absence = db.query(AbsenceModel).filter(AbsenceModel.id == absence_id).first()
    
    if not absence:
        raise HTTPException(status_code=404, detail='Absence not found')
    
    role = getattr(current_user, 'role', None)
    
    # Students can only delete their own pending absences
    if role == 'student':
        if absence.student_id != current_user.id:
            raise HTTPException(status_code=403, detail='Not authorized to delete this absence')
        if absence.status != AbsenceStatus.PENDING:
            raise HTTPException(status_code=400, detail='Can only delete pending absences')
    
    # Teachers can only delete absences of their homeroom students
    if role == 'teacher':
        if not is_homeroom_teacher_of_student(db, current_user.id, absence.student_id):
            raise HTTPException(status_code=403, detail='Not authorized to delete this absence')
    
    db.delete(absence)
    db.commit()
