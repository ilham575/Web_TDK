from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from typing import List
from schemas.user import UserCreate, User, AdminRequestCreate
from schemas.school import SchoolCreate, School
from models.user import User as UserModel
from models.school import School as SchoolModel
from models.announcement import Announcement as AnnouncementModel
from models.subject import Subject as SubjectModel
from models.attendance import Attendance as AttendanceModel
from models.grade import Grade as GradeModel
from models.admin_request import AdminRequest as AdminRequestModel
from models.document import Document as DocumentModel
from models.subject_student import SubjectStudent as SubjectStudentModel
from models.classroom import Classroom as ClassroomModel, ClassroomStudent as ClassroomStudentModel
from models.classroom_subject import ClassroomSubject as ClassroomSubjectModel
from models.schedule import ScheduleSlot as ScheduleSlotModel, SubjectSchedule as SubjectScheduleModel
from models.absence import Absence as AbsenceModel
from models.homeroom import HomeroomTeacher as HomeroomTeacherModel
from models.school_deletion_request import SchoolDeletionRequest as SchoolDeletionRequestModel
from models.password_reset_request import PasswordResetRequest as PasswordResetRequestModel
from utils.security import hash_password
from database.connection import get_db
from routers.user import get_current_user
import os
from datetime import datetime, timedelta

router = APIRouter(prefix="/owner", tags=["owner"])

def require_owner(current_user: UserModel = Depends(get_current_user)):
    if current_user.role != 'owner':
        raise HTTPException(status_code=403, detail="Only owners can access this resource")
    return current_user

@router.get("/schools", response_model=List[dict])
def get_schools_with_stats(db: Session = Depends(get_db), current_user: UserModel = Depends(require_owner)):
    schools = db.query(SchoolModel).all()
    result = []
    for school in schools:
        # Count users by role
        admins = db.query(UserModel).filter(UserModel.school_id == school.id, UserModel.role == 'admin').count()
        teachers = db.query(UserModel).filter(UserModel.school_id == school.id, UserModel.role == 'teacher').count()
        students = db.query(UserModel).filter(UserModel.school_id == school.id, UserModel.role == 'student').count()
        
        # Count active subjects
        active_subjects = db.query(SubjectModel).filter(SubjectModel.school_id == school.id, SubjectModel.is_ended == False).count()
        
        # Count recent announcements (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_announcements = db.query(AnnouncementModel).filter(
            AnnouncementModel.school_id == school.id,
            AnnouncementModel.created_at >= thirty_days_ago
        ).count()
        
        result.append({
            "id": school.id,
            "name": school.name,
            "admins": admins,
            "teachers": teachers,
            "students": students,
            "active_subjects": active_subjects,
            "recent_announcements": recent_announcements
        })
    return result

@router.post("/create_school", response_model=School)
def create_school(school: SchoolCreate, db: Session = Depends(get_db), current_user: UserModel = Depends(require_owner)):
    # Check if school name already exists
    db_school = db.query(SchoolModel).filter(SchoolModel.name == school.name).first()
    if db_school:
        raise HTTPException(status_code=400, detail="School already exists")
    
    new_school = SchoolModel(name=school.name)
    db.add(new_school)
    db.commit()
    db.refresh(new_school)
    return new_school

@router.post("/create_admin", response_model=User)
def create_admin_for_school(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_owner)
):
    if not user_data.school_id:
        raise HTTPException(status_code=400, detail="school_id is required for admin creation")
    
    username = user_data.username
    email = user_data.email
    full_name = user_data.full_name
    password = user_data.password
    school_id = user_data.school_id
    # Check if school exists
    school = db.query(SchoolModel).filter(SchoolModel.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    # Check if username already exists
    db_user = db.query(UserModel).filter(UserModel.username == username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Check if email already exists
    db_email = db.query(UserModel).filter(UserModel.email == email).first()
    if db_email:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    # Create admin user
    hashed_password = hash_password(password)
    db_user = UserModel(
        username=username,
        email=email,
        full_name=full_name,
        hashed_password=hashed_password,
        role="admin",
        school_id=school_id,
        must_change_password=True  # Force password change on first login
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.get("/activities", response_model=List[dict])
def get_recent_activities(limit: int = 50, db: Session = Depends(get_db), current_user: UserModel = Depends(require_owner)):
    activities = []
    
    # Recent announcements
    announcements = db.query(AnnouncementModel).order_by(AnnouncementModel.created_at.desc()).limit(limit).all()
    for ann in announcements:
        school = db.query(SchoolModel).filter(SchoolModel.id == ann.school_id).first()
        activities.append({
            "type": "announcement",
            "school_id": ann.school_id,
            "school_name": school.name if school else "Unknown",
            "title": ann.title,
            "content": ann.content[:100] + "..." if len(ann.content) > 100 else ann.content,
            "created_at": ann.created_at,
            "created_by": ann.author_id
        })
    
    # Recent subjects created
    subjects = db.query(SubjectModel).order_by(SubjectModel.created_at.desc()).limit(limit).all()
    for subj in subjects:
        school = db.query(SchoolModel).filter(SchoolModel.id == subj.school_id).first()
        teacher = db.query(UserModel).filter(UserModel.id == subj.teacher_id).first()
        activities.append({
            "type": "subject_created",
            "school_id": subj.school_id,
            "school_name": school.name if school else "Unknown",
            "title": f"Subject '{subj.name}' created",
            "content": f"Teacher: {teacher.full_name if teacher else 'Unknown'}",
            "created_at": subj.created_at,
            "created_by": subj.teacher_id
        })
    
    # Recent attendance records
    attendances = db.query(AttendanceModel).order_by(AttendanceModel.date.desc()).limit(limit).all()
    for att in attendances:
        subject = db.query(SubjectModel).filter(SubjectModel.id == att.subject_id).first()
        school = db.query(SchoolModel).filter(SchoolModel.id == subject.school_id).first() if subject else None
        activities.append({
            "type": "attendance",
            "school_id": subject.school_id if subject else None,
            "school_name": school.name if school else "Unknown",
            "title": f"Attendance recorded for {subject.name if subject else 'Unknown subject'}",
            "content": f"Date: {att.date}",
            "created_at": att.created_at,
            "created_by": subject.teacher_id if subject else None
        })
    
    # Recent grades
    grades = db.query(GradeModel).order_by(GradeModel.created_at.desc()).limit(limit).all()
    for grade in grades:
        subject = db.query(SubjectModel).filter(SubjectModel.id == grade.subject_id).first()
        school = db.query(SchoolModel).filter(SchoolModel.id == subject.school_id).first() if subject else None
        student = db.query(UserModel).filter(UserModel.id == grade.student_id).first()
        activities.append({
            "type": "grade",
            "school_id": subject.school_id if subject else None,
            "school_name": school.name if school else "Unknown",
            "title": f"Grade recorded for {student.full_name if student else 'Unknown student'}",
            "content": f"Subject: {subject.name if subject else 'Unknown'}, Grade: {grade.grade}",
            "created_at": grade.created_at,
            "created_by": subject.teacher_id if subject else None
        })
    
    # Sort by created_at descending
    activities.sort(key=lambda x: x["created_at"], reverse=True)
    return activities[:limit]

@router.post("/request_admin")
def request_admin(request: AdminRequestCreate, db: Session = Depends(get_db)):
    # Check if username already exists in users or requests
    existing_user = db.query(UserModel).filter(UserModel.username == request.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    existing_request = db.query(AdminRequestModel).filter(AdminRequestModel.username == request.username).first()
    if existing_request:
        raise HTTPException(status_code=400, detail="Request already exists for this username")
    
    # Check email
    existing_email = db.query(UserModel).filter(UserModel.email == request.email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    existing_email_request = db.query(AdminRequestModel).filter(AdminRequestModel.email == request.email).first()
    if existing_email_request:
        raise HTTPException(status_code=400, detail="Request already exists for this email")
    
    # Hash password
    hashed = hash_password(request.password)
    
    # Create request
    request_obj = AdminRequestModel(
        username=request.username,
        email=request.email,
        full_name=request.full_name,
        password_hash=hashed,
        school_name=request.school_name,
        status="pending"
    )
    db.add(request_obj)
    db.commit()
    db.refresh(request_obj)
    return {"message": "Admin request submitted successfully", "id": request_obj.id}


@router.delete("/schools/{school_id}", status_code=204)
def delete_school_as_owner(school_id: int, db: Session = Depends(get_db), current_user: UserModel = Depends(require_owner)):
    """Delete a school and all users associated with it. Only owners may call this."""

    # Check if there's a deletion request for this school
    deletion_request = db.query(SchoolDeletionRequestModel).filter(
        SchoolDeletionRequestModel.school_id == school_id
    ).first()

    if not deletion_request:
        raise HTTPException(
            status_code=403,
            detail="Cannot delete school without a deletion request from an admin"
        )

    # Proceed with deletion (existing logic)
    school = db.query(SchoolModel).filter(SchoolModel.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    # Get all user IDs belonging to this school for cascade deletions
    user_ids = [u.id for u in db.query(UserModel).filter(UserModel.school_id == school_id).all()]

    # Delete in dependency order (respecting FK constraints)
    try:
        # 1. Delete announcements for this school
        db.query(AnnouncementModel).filter(AnnouncementModel.school_id == school_id).delete(synchronize_session=False)

        # 2. Delete documents uploaded by users in this school
        db.query(DocumentModel).filter(DocumentModel.uploaded_by.in_(user_ids)).delete(synchronize_session=False)

        # 3. Delete grades for students in this school
        db.query(GradeModel).filter(GradeModel.student_id.in_(user_ids)).delete(synchronize_session=False)

        # 4. Delete subject enrollments for students in this school
        db.query(SubjectStudentModel).filter(SubjectStudentModel.student_id.in_(user_ids)).delete(synchronize_session=False)

        # 5. Delete subject schedules (teacher assignments) for teachers in this school BEFORE schedule_slots
        # Find subject IDs for this school first
        subject_ids = [s.id for s in db.query(SubjectModel).filter(SubjectModel.school_id == school_id).all()]
        # Delete by subject_id AND by teacher_id (both can reference school users/subjects)
        db.query(SubjectScheduleModel).filter(SubjectScheduleModel.subject_id.in_(subject_ids)).delete(synchronize_session=False)
        db.query(SubjectScheduleModel).filter(SubjectScheduleModel.teacher_id.in_(user_ids)).delete(synchronize_session=False)

        # 6. Delete schedule slots created by users in this school (after subject_schedules cleanup)
        db.query(ScheduleSlotModel).filter(ScheduleSlotModel.created_by.in_(user_ids)).delete(synchronize_session=False)

        # 7. Delete classroom students for students in this school
        db.query(ClassroomStudentModel).filter(ClassroomStudentModel.student_id.in_(user_ids)).delete(synchronize_session=False)

        # 8. Delete absences (both student_id and approved_by can be from this school)
        db.query(AbsenceModel).filter(AbsenceModel.student_id.in_(user_ids)).delete(synchronize_session=False)
        db.query(AbsenceModel).filter(AbsenceModel.approved_by.in_(user_ids)).delete(synchronize_session=False)

        # 9. Delete password reset requests for users in this school
        db.query(PasswordResetRequestModel).filter(PasswordResetRequestModel.user_id.in_(user_ids)).delete(synchronize_session=False)

        # 10. Delete school deletion requests for this school (before deleting users)
        db.query(SchoolDeletionRequestModel).filter(SchoolDeletionRequestModel.school_id == school_id).delete(synchronize_session=False)

        # 11. Delete homeroom teacher assignments for teachers in this school
        db.query(HomeroomTeacherModel).filter(HomeroomTeacherModel.teacher_id.in_(user_ids)).delete(synchronize_session=False)

        # 12. Delete attendance records (by subject_id) BEFORE subjects
        db.query(AttendanceModel).filter(AttendanceModel.subject_id.in_(subject_ids)).delete(synchronize_session=False)
        # 13. Delete classroom_subject relations for this school's subjects (must be removed before deleting subjects)
        if subject_ids:
            db.query(ClassroomSubjectModel).filter(ClassroomSubjectModel.subject_id.in_(subject_ids)).delete(synchronize_session=False)

        # 14. Delete subjects for this school (after schedule cleanup and attendances)
        db.query(SubjectModel).filter(SubjectModel.school_id == school_id).delete(synchronize_session=False)

        # 15. Delete classrooms for this school
        db.query(ClassroomModel).filter(ClassroomModel.school_id == school_id).delete(synchronize_session=False)

        # 16. Delete all users belonging to this school
        db.query(UserModel).filter(UserModel.school_id == school_id).delete(synchronize_session=False)

        # Keep logo path for safe deletion after commit
        old_logo = school.logo_url

        # 15. Delete the school
        db.delete(school)
        db.commit()

        # Safely delete logo file if it looks like our managed upload
        try:
            UPLOAD_DIR = "uploads/logos"
            if old_logo and isinstance(old_logo, str) and old_logo.startswith('/uploads/logos/'):
                filename = os.path.basename(old_logo)
                abs_upload_dir = os.path.abspath(UPLOAD_DIR)
                candidate = os.path.abspath(os.path.join(UPLOAD_DIR, filename))
                if candidate.startswith(abs_upload_dir + os.path.sep) or candidate == abs_upload_dir:
                    if os.path.exists(candidate):
                        os.remove(candidate)
        except Exception:
            # Don't fail the request if file deletion fails
            pass

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting school and related data: {str(e)}")

    return

@router.get("/admin_requests", response_model=List[dict])
def get_admin_requests(db: Session = Depends(get_db), current_user: UserModel = Depends(require_owner)):
    requests = db.query(AdminRequestModel).order_by(AdminRequestModel.created_at.desc()).all()
    return [
        {
            "id": r.id,
            "username": r.username,
            "email": r.email,
            "full_name": r.full_name,
            "school_name": r.school_name,
            "status": r.status,
            "created_at": r.created_at
        } for r in requests
    ]

@router.patch("/admin_requests/{request_id}/approve")
def approve_admin_request(request_id: int, db: Session = Depends(get_db), current_user: UserModel = Depends(require_owner)):
    request = db.query(AdminRequestModel).filter(AdminRequestModel.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if request.status != "pending":
        raise HTTPException(status_code=400, detail="Request already processed")
    
    # Find or create school
    school = db.query(SchoolModel).filter(SchoolModel.name == request.school_name).first()
    if not school:
        school = SchoolModel(name=request.school_name)
        db.add(school)
        db.commit()
        db.refresh(school)
    
    # Create user
    user = UserModel(
        username=request.username,
        email=request.email,
        full_name=request.full_name,
        hashed_password=request.password_hash,
        role="admin",
        school_id=school.id,
        must_change_password=True  # Force password change on first login
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Update request status
    request.status = "approved"
    db.commit()
    
    return {"message": "Admin request approved and user created", "user_id": user.id}

@router.patch("/admin_requests/{request_id}/reject")
def reject_admin_request(request_id: int, db: Session = Depends(get_db), current_user: UserModel = Depends(require_owner)):
    request = db.query(AdminRequestModel).filter(AdminRequestModel.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if request.status != "pending":
        raise HTTPException(status_code=400, detail="Request already processed")
    
    request.status = "rejected"
    db.commit()
    
    return {"message": "Admin request rejected"}

@router.get("/school_deletion_requests", response_model=List[dict])
def get_school_deletion_requests(db: Session = Depends(get_db), current_user: UserModel = Depends(require_owner)):
    """Owner can view all pending school deletion requests."""
    from models.user import User as UserModel
    from models.school import School as SchoolModel

    requests = db.query(SchoolDeletionRequestModel).filter(
        SchoolDeletionRequestModel.status == "pending"
    ).order_by(SchoolDeletionRequestModel.created_at.desc()).all()

    result = []
    for req in requests:
        # Get school info
        school = db.query(SchoolModel).filter(SchoolModel.id == req.school_id).first()
        # Get requester info
        requester = db.query(UserModel).filter(UserModel.id == req.requested_by).first()

        result.append({
            "id": req.id,
            "school_id": req.school_id,
            "school_name": school.name if school else "Unknown School",
            "requested_by": req.requested_by,
            "requester_name": requester.full_name if requester else "Unknown User",
            "requester_username": requester.username if requester else "Unknown",
            "reason": req.reason,
            "status": req.status,
            "created_at": req.created_at
        })

    return result

@router.patch("/school_deletion_requests/{request_id}/approve")
def approve_school_deletion_request(request_id: int, db: Session = Depends(get_db), current_user: UserModel = Depends(require_owner)):
    """Owner approves a school deletion request, which will delete the school."""
    request = db.query(SchoolDeletionRequestModel).filter(SchoolDeletionRequestModel.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    if request.status != "pending":
        raise HTTPException(status_code=400, detail="Request already processed")

    # Mark request as approved
    request.status = "approved"
    request.reviewed_by = current_user.id
    request.reviewed_at = datetime.utcnow()
    db.commit()

    # Now delete the school (this will use our existing delete_school_as_owner function)
    try:
        delete_school_as_owner(request.school_id, db, current_user)
        return {"message": "School deletion request approved and school deleted successfully"}
    except Exception as e:
        # If deletion fails, revert the request status
        request.status = "pending"
        request.reviewed_by = None
        request.reviewed_at = None
        db.commit()
        raise HTTPException(status_code=500, detail=f"Failed to delete school: {str(e)}")

@router.patch("/school_deletion_requests/{request_id}/reject")
def reject_school_deletion_request(
    request_id: int,
    review_notes: str = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_owner)
):
    """Owner rejects a school deletion request."""
    request = db.query(SchoolDeletionRequestModel).filter(SchoolDeletionRequestModel.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    if request.status != "pending":
        raise HTTPException(status_code=400, detail="Request already processed")

    request.status = "rejected"
    request.reviewed_by = current_user.id
    request.reviewed_at = datetime.utcnow()
    request.review_notes = review_notes
    db.commit()

    return {"message": "School deletion request rejected"}