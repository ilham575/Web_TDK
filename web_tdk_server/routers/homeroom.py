from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
import json
from datetime import datetime, timezone

from schemas.homeroom import HomeroomTeacher, HomeroomTeacherCreate, HomeroomTeacherUpdate, HomeroomTeacherWithDetails, HomeroomCopyRequest
from models.homeroom import HomeroomTeacher as HomeroomTeacherModel
from models.user import User as UserModel
from models.classroom import Classroom as ClassroomModel, ClassroomStudent as ClassroomStudentModel
from models.grade import Grade as GradeModel
from models.attendance import Attendance as AttendanceModel
from models.subject import Subject as SubjectModel
from models.subject_student import SubjectStudent as SubjectStudentModel
from models.school import School as SchoolModel
from models.school_access_control import SchoolAccessControl as SchoolAccessControlModel
from database.connection import get_db
from routers.user import get_current_user

router = APIRouter(prefix="/homeroom", tags=["homeroom"])


def _serialize_homeroom_conflict(db: Session, hr: HomeroomTeacherModel):
    teacher = db.query(UserModel).filter(UserModel.id == hr.teacher_id).first()
    classroom = None
    if getattr(hr, 'classroom_id', None):
        classroom = db.query(ClassroomModel).filter(ClassroomModel.id == hr.classroom_id).first()

    return {
        "id": hr.id,
        "teacher_id": hr.teacher_id,
        "teacher_name": teacher.full_name if teacher else None,
        "teacher_email": teacher.email if teacher else None,
        "classroom_id": getattr(hr, 'classroom_id', None),
        "classroom_name": classroom.name if classroom else None,
        "grade_level": hr.grade_level,
        "school_id": hr.school_id,
        "academic_year": hr.academic_year,
        "semester": getattr(hr, 'semester', None),
    }


def _raise_homeroom_integrity_error(exc: IntegrityError):
    message = str(getattr(exc, "orig", exc))
    if 'uq_homeroom_teacher_school_year' in message:
        raise HTTPException(
            status_code=400,
            detail="ฐานข้อมูลยังใช้ unique constraint แบบเก่า ทำให้ครู 1 คนยังถูกบังคับซ้ำได้แค่ต่อปีการศึกษาเดียว แม้คนละภาคเรียน กรุณารัน migration ปรับ homeroom indexes ก่อน"
        )
    if 'uq_homeroom_teacher_school_year_semester' in message:
        raise HTTPException(
            status_code=400,
            detail="ครูท่านนี้มีการประจำชั้นอยู่แล้วในปีการศึกษาและภาคเรียนนี้"
        )
    if 'uq_homeroom_classroom_year' in message or 'uq_homeroom_classroom_year_semester' in message:
        raise HTTPException(
            status_code=400,
            detail="ห้องเรียนนี้มีครูประจำชั้นในปีการศึกษาและภาคเรียนนี้แล้ว"
        )
    raise HTTPException(status_code=400, detail="ไม่สามารถบันทึกข้อมูลครูประจำชั้นได้ เนื่องจากชนกับข้อจำกัดข้อมูลซ้ำในฐานข้อมูล")


@router.get("", response_model=List[HomeroomTeacherWithDetails])
@router.get("/", response_model=List[HomeroomTeacherWithDetails])
def get_homeroom_teachers(
    school_id: Optional[int] = None,
    classroom_id: Optional[int] = None,
    academic_year: Optional[str] = None,
    semester: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """ดึงรายชื่อครูประจำชั้นทั้งหมด"""
    query = db.query(HomeroomTeacherModel)
    
    # Filter by classroom_id first (specific classroom)
    if classroom_id:
        query = query.filter(HomeroomTeacherModel.classroom_id == classroom_id)
    # Filter by school_id
    elif school_id:
        query = query.filter(HomeroomTeacherModel.school_id == school_id)
    elif current_user.school_id:
        query = query.filter(HomeroomTeacherModel.school_id == current_user.school_id)
    
    # Filter by academic_year if provided
    if academic_year:
        query = query.filter(HomeroomTeacherModel.academic_year == academic_year)
    if semester is not None:
        query = query.filter(HomeroomTeacherModel.semester == semester)
    
    homerooms = query.all()

    # Enrich with teacher details and student count
    result = []
    for hr in homerooms:
        teacher = db.query(UserModel).filter(UserModel.id == hr.teacher_id).first()

        # If homeroom is tied to a specific classroom, count students in that classroom
        if getattr(hr, 'classroom_id', None):
            student_count = db.query(ClassroomStudentModel).filter(
                ClassroomStudentModel.classroom_id == hr.classroom_id,
            ).count()
            classroom = db.query(ClassroomModel).filter(ClassroomModel.id == hr.classroom_id).first()
            classroom_name = classroom.name if classroom else None
        else:
            # Count students in this grade level at this school
            student_count = db.query(UserModel).filter(
                UserModel.role == 'student',
                UserModel.school_id == hr.school_id,
                UserModel.grade_level == hr.grade_level,
                UserModel.is_active == True
            ).count()
            classroom_name = None

        result.append(HomeroomTeacherWithDetails(
            id=hr.id,
            teacher_id=hr.teacher_id,
            grade_level=hr.grade_level,
            classroom_id=getattr(hr, 'classroom_id', None),
            school_id=hr.school_id,
            academic_year=hr.academic_year,
            semester=getattr(hr, 'semester', None),
            created_at=hr.created_at,
            updated_at=hr.updated_at,
            teacher_name=teacher.full_name if teacher else None,
            teacher_email=teacher.email if teacher else None,
            student_count=student_count,
            classroom_name=classroom_name
        ))

    return result


@router.get("/grade-levels")
def get_available_grade_levels(
    school_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """ดึงรายชื่อชั้นเรียนทั้งหมดที่มีในระบบ (จากนักเรียน)"""
    sid = school_id or current_user.school_id
    
    # Get distinct grade levels from students
    grade_levels = db.query(UserModel.grade_level).filter(
        UserModel.role == 'student',
        UserModel.school_id == sid,
        UserModel.grade_level.isnot(None),
        UserModel.grade_level != ''
    ).distinct().all()
    
    return [g[0] for g in grade_levels if g[0]]


@router.get("/{homeroom_id}", response_model=HomeroomTeacherWithDetails)
def get_homeroom_teacher(
    homeroom_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """ดึงข้อมูลครูประจำชั้นตาม ID"""
    hr = db.query(HomeroomTeacherModel).filter(HomeroomTeacherModel.id == homeroom_id).first()
    if not hr:
        raise HTTPException(status_code=404, detail="ไม่พบข้อมูลครูประจำชั้น")
    
    teacher = db.query(UserModel).filter(UserModel.id == hr.teacher_id).first()

    if getattr(hr, 'classroom_id', None):
        student_count = db.query(ClassroomStudentModel).filter(
            ClassroomStudentModel.classroom_id == hr.classroom_id,
        ).count()
        classroom = db.query(ClassroomModel).filter(ClassroomModel.id == hr.classroom_id).first()
        classroom_name = classroom.name if classroom else None
    else:
        student_count = db.query(UserModel).filter(
            UserModel.role == 'student',
            UserModel.school_id == hr.school_id,
            UserModel.grade_level == hr.grade_level,
            UserModel.is_active == True
        ).count()
        classroom_name = None

    return HomeroomTeacherWithDetails(
        id=hr.id,
        teacher_id=hr.teacher_id,
        grade_level=hr.grade_level,
        classroom_id=getattr(hr, 'classroom_id', None),
        school_id=hr.school_id,
        academic_year=hr.academic_year,
        semester=getattr(hr, 'semester', None),
        created_at=hr.created_at,
        updated_at=hr.updated_at,
        teacher_name=teacher.full_name if teacher else None,
        teacher_email=teacher.email if teacher else None,
        student_count=student_count,
        classroom_name=classroom_name
    )


@router.post("", response_model=HomeroomTeacher, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=HomeroomTeacher, status_code=status.HTTP_201_CREATED)
def create_homeroom_teacher(
    homeroom: HomeroomTeacherCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Admin-only: กำหนดครูประจำชั้น"""
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="เฉพาะแอดมินเท่านั้นที่สามารถกำหนดครูประจำชั้นได้")
    
    # Verify teacher exists and is a teacher
    teacher = db.query(UserModel).filter(
        UserModel.id == homeroom.teacher_id,
        UserModel.role == 'teacher'
    ).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="ไม่พบครูที่ระบุ หรือผู้ใช้ไม่ได้เป็นครู")
    
    # If classroom_id provided, validate classroom exists and belongs to this school
    classroom = None
    if getattr(homeroom, 'classroom_id', None):
        classroom = db.query(ClassroomModel).filter(
            ClassroomModel.id == homeroom.classroom_id,
            ClassroomModel.school_id == homeroom.school_id
        ).first()
        if not classroom:
            raise HTTPException(status_code=404, detail="ไม่พบห้องเรียนที่ระบุ หรือไม่อยู่ในโรงเรียนเดียวกัน")

    # Check if this teacher is already assigned to another class for this school/year
    # (One teacher can only manage ONE homeroom per academic year/semester)
    existing = db.query(HomeroomTeacherModel).filter(
        HomeroomTeacherModel.teacher_id == homeroom.teacher_id,
        HomeroomTeacherModel.school_id == homeroom.school_id,
        HomeroomTeacherModel.academic_year == (classroom.academic_year if classroom else homeroom.academic_year),
        HomeroomTeacherModel.semester == (classroom.semester if classroom else homeroom.semester)
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "homeroom_teacher_conflict",
                "message": f"ครูท่านนี้มีการประจำชั้นอยู่แล้ว (ชั้น {existing.grade_level}) ครูสามารถประจำชั้นได้เพียงแค่ 1 ห้องเท่านั้น",
                "conflict": _serialize_homeroom_conflict(db, existing),
            }
        )
    
    # Create homeroom teacher assignment
    # If classroom provided, prefer classroom.grade_level as assigned grade
    assigned_grade = homeroom.grade_level
    assigned_year = homeroom.academic_year
    assigned_semester = homeroom.semester
    if classroom and getattr(classroom, 'grade_level', None):
        assigned_grade = classroom.grade_level
        assigned_year = classroom.academic_year
        assigned_semester = classroom.semester

    db_homeroom = HomeroomTeacherModel(
        teacher_id=homeroom.teacher_id,
        grade_level=assigned_grade,
        classroom_id=getattr(homeroom, 'classroom_id', None),
        school_id=homeroom.school_id,
        academic_year=assigned_year,
        semester=assigned_semester
    )
    
    db.add(db_homeroom)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        _raise_homeroom_integrity_error(exc)
    db.refresh(db_homeroom)
    
    return db_homeroom


@router.patch("/{homeroom_id}", response_model=HomeroomTeacher)
def update_homeroom_teacher(
    homeroom_id: int,
    homeroom_update: HomeroomTeacherUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Admin-only: แก้ไขครูประจำชั้น"""
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="เฉพาะแอดมินเท่านั้นที่สามารถแก้ไขครูประจำชั้นได้")
    
    hr = db.query(HomeroomTeacherModel).filter(HomeroomTeacherModel.id == homeroom_id).first()
    if not hr:
        raise HTTPException(status_code=404, detail="ไม่พบข้อมูลครูประจำชั้น")
    
    update_data = homeroom_update.dict(exclude_unset=True)
    
    # If changing teacher, verify the new teacher exists
    if 'teacher_id' in update_data:
        teacher = db.query(UserModel).filter(
            UserModel.id == update_data['teacher_id'],
            UserModel.role == 'teacher'
        ).first()
        if not teacher:
            raise HTTPException(status_code=404, detail="ไม่พบครูที่ระบุ หรือผู้ใช้ไม่ได้เป็นครู")
    
    # Check if changing teacher: new teacher must not already be assigned to another class
    if 'teacher_id' in update_data:
        new_teacher_id = update_data['teacher_id']
        existing = db.query(HomeroomTeacherModel).filter(
            HomeroomTeacherModel.teacher_id == new_teacher_id,
            HomeroomTeacherModel.school_id == hr.school_id,
            HomeroomTeacherModel.academic_year == (update_data.get('academic_year') or hr.academic_year),
            HomeroomTeacherModel.semester == (update_data.get('semester') if 'semester' in update_data else hr.semester),
            HomeroomTeacherModel.id != homeroom_id
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "homeroom_teacher_conflict",
                    "message": f"ครูท่านนี้มีการประจำชั้นอยู่แล้ว (ชั้น {existing.grade_level}) ครูสามารถประจำชั้นได้เพียงแค่ 1 ห้องเท่านั้น",
                    "conflict": _serialize_homeroom_conflict(db, existing),
                }
            )

    # If changing classroom, verify classroom exists and belongs to the same school
    if 'classroom_id' in update_data:
        new_classroom = db.query(ClassroomModel).filter(
            ClassroomModel.id == update_data['classroom_id'],
            ClassroomModel.school_id == hr.school_id
        ).first()
        if not new_classroom:
            raise HTTPException(status_code=404, detail="ไม่พบห้องเรียนที่ระบุ หรือไม่อยู่ในโรงเรียนเดียวกัน")

        update_data['grade_level'] = new_classroom.grade_level
        update_data['academic_year'] = new_classroom.academic_year
        update_data['semester'] = new_classroom.semester
    
    for key, value in update_data.items():
        setattr(hr, key, value)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        _raise_homeroom_integrity_error(exc)
    db.refresh(hr)
    
    return hr


@router.post("/copy")
def copy_homeroom_assignments(
    copy_req: HomeroomCopyRequest,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Admin-only: copy homeroom assignments from one academic year to another using parent_classroom_id mapping."""
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="เฉพาะแอดมินเท่านั้นที่สามารถใช้งานฟีเจอร์นี้ได้")

    school_id = copy_req.school_id or current_user.school_id
    from_year = copy_req.from_year
    to_year = copy_req.to_year

    if not from_year or not to_year:
        raise HTTPException(status_code=400, detail="ต้องระบุ from_year และ to_year")

    assignments = db.query(HomeroomTeacherModel).filter(
        HomeroomTeacherModel.school_id == school_id,
        HomeroomTeacherModel.academic_year == from_year
    ).all()

    copied = 0
    skipped = 0
    unmapped = []

    for a in assignments:
        # Only handle assignments that reference a classroom (we can extend heuristics later)
        if not a.classroom_id:
            unmapped.append({'id': a.id, 'reason': 'no_classroom', 'grade_level': a.grade_level})
            continue

        # Find child classroom in to_year by parent_classroom_id
        child = db.query(ClassroomModel).filter(
            ClassroomModel.parent_classroom_id == a.classroom_id,
            ClassroomModel.academic_year == to_year,
            ClassroomModel.school_id == school_id,
            ClassroomModel.semester == getattr(a, 'semester', None)
        ).first()

        if not child:
            unmapped.append({'id': a.id, 'classroom_id': a.classroom_id, 'reason': 'no_target_classroom'})
            continue

        # Skip if classroom already has a homeroom assignment
        exists = db.query(HomeroomTeacherModel).filter(
            HomeroomTeacherModel.classroom_id == child.id,
            HomeroomTeacherModel.academic_year == to_year,
            HomeroomTeacherModel.semester == child.semester
        ).first()

        if exists:
            skipped += 1
            continue

        # Create new assignment in target year
        new_hr = HomeroomTeacherModel(
            teacher_id=a.teacher_id,
            classroom_id=child.id,
            grade_level=child.grade_level,
            school_id=school_id,
            academic_year=to_year,
            semester=child.semester
        )
        db.add(new_hr)
        copied += 1

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        _raise_homeroom_integrity_error(exc)

    return { 'copied': copied, 'skipped': skipped, 'unmapped': unmapped }


@router.delete("/{homeroom_id}")
def delete_homeroom_teacher(
    homeroom_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Admin-only: ลบครูประจำชั้น"""
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="เฉพาะแอดมินเท่านั้นที่สามารถลบครูประจำชั้นได้")
    
    hr = db.query(HomeroomTeacherModel).filter(HomeroomTeacherModel.id == homeroom_id).first()
    if not hr:
        raise HTTPException(status_code=404, detail="ไม่พบข้อมูลครูประจำชั้น")
    
    db.delete(hr)
    db.commit()
    
    return {"message": "ลบครูประจำชั้นเรียบร้อยแล้ว"}


@router.get("/by-grade/{grade_level}", response_model=Optional[HomeroomTeacherWithDetails])
def get_homeroom_by_grade(
    grade_level: str,
    school_id: Optional[int] = None,
    academic_year: Optional[str] = None,
    semester: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """ดึงข้อมูลครูประจำชั้นตามชั้นเรียน"""
    sid = school_id or current_user.school_id
    
    query = db.query(HomeroomTeacherModel).filter(
        HomeroomTeacherModel.grade_level == grade_level,
        HomeroomTeacherModel.school_id == sid
    )
    
    if academic_year:
        query = query.filter(HomeroomTeacherModel.academic_year == academic_year)
    if semester is not None:
        query = query.filter(HomeroomTeacherModel.semester == semester)
    
    hr = query.first()
    
    if not hr:
        return None
    
    teacher = db.query(UserModel).filter(UserModel.id == hr.teacher_id).first()
    student_count = db.query(UserModel).filter(
        UserModel.role == 'student',
        UserModel.school_id == hr.school_id,
        UserModel.grade_level == hr.grade_level,
        UserModel.is_active == True
    ).count()
    
    return HomeroomTeacherWithDetails(
        id=hr.id,
        teacher_id=hr.teacher_id,
        grade_level=hr.grade_level,
        school_id=hr.school_id,
        academic_year=hr.academic_year,
        semester=getattr(hr, 'semester', None),
        created_at=hr.created_at,
        updated_at=hr.updated_at,
        teacher_name=teacher.full_name if teacher else None,
        teacher_email=teacher.email if teacher else None,
        student_count=student_count
    )


@router.get("/students/{grade_level}")
def get_students_by_grade(
    grade_level: str,
    school_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """ดึงรายชื่อนักเรียนในชั้นเรียน"""
    sid = school_id or current_user.school_id
    
    students = db.query(UserModel).filter(
        UserModel.role == 'student',
        UserModel.school_id == sid,
        UserModel.grade_level == grade_level,
        UserModel.is_active == True
    ).order_by(UserModel.full_name).all()
    
    return [{
        'id': s.id,
        'username': s.username,
        'full_name': s.full_name,
        'email': s.email,
        'grade_level': s.grade_level
    } for s in students]


@router.get("/my-classrooms/summary")
def get_homeroom_summary(
    academic_year: Optional[str] = None,
    semester: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """ดึงข้อมูลสรุปของนักเรียนในชั้นที่ครูประจำ (คะแนน + การเข้าเรียน จัดกลุ่มตามวิชา)"""
    if current_user.role not in ['teacher', 'admin']:
        raise HTTPException(status_code=403, detail="ต้องเป็นครูหรือแอดมินเท่านั้น")
    
    # Get homeroom assignments for this teacher
    homerooms = db.query(HomeroomTeacherModel).filter(
        HomeroomTeacherModel.teacher_id == current_user.id
    ).all()
    
    if not homerooms:
        return {"classrooms": [], "message": "ไม่พบข้อมูลครูประจำชั้น"}
    
    # Check if grades are announced or if summary view is permitted (for non-admin teachers)
    is_permitted = True
    if current_user.role == 'teacher':
        for hr in homerooms:
            school = db.query(SchoolModel).filter(SchoolModel.id == hr.school_id).first()
            if school:
                # 1. Check new per-year/semester access control table first (takes priority)
                if academic_year and semester is not None:
                    access_control = db.query(SchoolAccessControlModel).filter(
                        SchoolAccessControlModel.school_id == hr.school_id,
                        SchoolAccessControlModel.academic_year == str(academic_year),
                        SchoolAccessControlModel.semester == semester
                    ).first()
                    if access_control is not None:
                        # Record exists — use its value directly
                        if not access_control.allow_teacher_view_summary:
                            is_permitted = False
                            break
                        else:
                            # Explicitly allowed — skip further checks for this school
                            continue
                
                # 2. Fallback: check legacy school-level toggle
                if hasattr(school, 'can_teacher_view_summary') and school.can_teacher_view_summary == 0:
                    is_permitted = False
                    break
                
                # 3. Check if Date-based restriction applies
                if hasattr(school, 'grade_announcement_date') and school.grade_announcement_date:
                    now = datetime.now(timezone.utc)
                    announcement_date = school.grade_announcement_date
                    if announcement_date.tzinfo is None:
                        announcement_date = announcement_date.replace(tzinfo=timezone.utc)
                    if now < announcement_date:
                        is_permitted = False
                        break
    
    if not is_permitted and current_user.role == 'teacher':
        return {"classrooms": [], "message": "ยังไม่ถึงเวลาประกาศผล หรือแอดมินยังไม่อนุญาตให้ดูสรุปคะแนน"}
    
    result = []
    
    for hr in homerooms:
        # If caller requested a specific academic_year, ensure the homeroom assignment
        # itself is for that year. Allow flexible matching so callers may pass '69' or '2569'.
        if academic_year:
            if not hr.academic_year:
                continue
            hr_year = str(hr.academic_year).strip()
            q_year = str(academic_year).strip()
            if not (hr_year == q_year or hr_year.endswith(q_year) or q_year.endswith(hr_year)):
                continue
        if semester is not None and getattr(hr, 'semester', None) not in (None, semester):
            continue

        # Use the exact assigned classroom when available; otherwise fall back to grade-level matching.
        if getattr(hr, 'classroom_id', None):
            classrooms_query = db.query(ClassroomModel).filter(
                ClassroomModel.id == hr.classroom_id,
                ClassroomModel.school_id == hr.school_id
            )
        else:
            classrooms_query = db.query(ClassroomModel).filter(
                ClassroomModel.school_id == hr.school_id,
                ClassroomModel.grade_level == hr.grade_level
            )
        
        # If classrooms have academic_year, filter them too. Support short-year like "69" matching "2569".
        if academic_year and hasattr(ClassroomModel, 'academic_year'):
            q_year = str(academic_year).strip()
            # If caller passed a short year (length <= 2) try matching the rightmost digits as well
            if len(q_year) <= 2:
                classrooms_query = classrooms_query.filter(or_(
                    ClassroomModel.academic_year == academic_year,
                    func.right(ClassroomModel.academic_year, len(q_year)) == q_year
                ))
            else:
                classrooms_query = classrooms_query.filter(ClassroomModel.academic_year == academic_year)

        # Also filter by semester when provided so we don't return other-term rooms
        if semester is not None and hasattr(ClassroomModel, 'semester'):
            classrooms_query = classrooms_query.filter(ClassroomModel.semester == semester)

        classrooms = classrooms_query.all()
        
        for classroom in classrooms:
            # Get students in this classroom.
            # Do NOT filter by is_active here — students from past terms have is_active=False
            # (they were promoted to the next year's classroom) but are still valid members of
            # this historical classroom. The classroom itself is already scoped to a specific
            # academic_year / semester via classrooms_query above.
            seen_student_ids: set = set()
            _raw_enrollments = db.query(ClassroomStudentModel, UserModel).join(
                UserModel, ClassroomStudentModel.student_id == UserModel.id
            ).filter(
                ClassroomStudentModel.classroom_id == classroom.id
            ).order_by(ClassroomStudentModel.is_active.desc()).all()
            # Deduplicate: keep the first (most-active) record per student
            enrollments = []
            for _enr, _stu in _raw_enrollments:
                if _stu.id not in seen_student_ids:
                    seen_student_ids.add(_stu.id)
                    enrollments.append((_enr, _stu))
            
            students_data = []
            for enrollment, student in enrollments:
                # Get grades for this student grouped by subject
                grades_query = db.query(GradeModel, SubjectModel).join(
                    SubjectModel, GradeModel.subject_id == SubjectModel.id
                ).filter(
                    GradeModel.student_id == student.id
                )
                if academic_year:
                    q_year = str(academic_year).strip()
                    if len(q_year) <= 2:
                        grades_query = grades_query.filter(or_(
                            SubjectModel.academic_year == academic_year,
                            func.right(SubjectModel.academic_year, len(q_year)) == q_year
                        ))
                    else:
                        grades_query = grades_query.filter(SubjectModel.academic_year == academic_year)
                if semester is not None:
                    grades_query = grades_query.filter(SubjectModel.semester == semester)
                grades_query = grades_query.all()
                
                grades_by_subject = {}
                for grade, subject in grades_query:
                    if subject.id not in grades_by_subject:
                        grades_by_subject[subject.id] = {
                            'subject_id': subject.id,
                            'linked_subject_id': getattr(subject, 'linked_subject_id', None),
                            'subject_name': subject.name,
                            'subject_type': subject.subject_type,
                            'is_activity': subject.subject_type == 'activity',
                            'credits': subject.credits if hasattr(subject, 'credits') else None,
                            'activity_percentage': subject.activity_percentage if hasattr(subject, 'activity_percentage') and subject.activity_percentage is not None else 0,
                            'max_collected_score': subject.max_collected_score if hasattr(subject, 'max_collected_score') and subject.max_collected_score is not None else 100,
                            'max_exam_score': subject.max_exam_score if hasattr(subject, 'max_exam_score') and subject.max_exam_score is not None else 100,
                            'assignments': [],
                            'total_score': 0,
                            'total_max_score': 0
                        }
                    # Only include grades if they are announced
                    if grade.grade is not None and grade.max_score:
                        grades_by_subject[subject.id]['assignments'].append({
                            'title': grade.title,
                            'score': float(grade.grade),
                            'max_score': float(grade.max_score)
                        })
                        grades_by_subject[subject.id]['total_score'] += float(grade.grade)
                        grades_by_subject[subject.id]['total_max_score'] += float(grade.max_score)
                
                # Get attendance grouped by subject
                enrolled_subjects_q = db.query(SubjectStudentModel.subject_id).join(
                    SubjectModel, SubjectStudentModel.subject_id == SubjectModel.id
                ).filter(
                    SubjectStudentModel.student_id == student.id
                )
                if academic_year:
                    q_year = str(academic_year).strip()
                    if len(q_year) <= 2:
                        enrolled_subjects_q = enrolled_subjects_q.filter(or_(
                            SubjectModel.academic_year == academic_year,
                            func.right(SubjectModel.academic_year, len(q_year)) == q_year
                        ))
                    else:
                        enrolled_subjects_q = enrolled_subjects_q.filter(SubjectModel.academic_year == academic_year)
                if semester is not None:
                    enrolled_subjects_q = enrolled_subjects_q.filter(SubjectModel.semester == semester)
                enrolled_subjects = enrolled_subjects_q.all()
                enrolled_subject_ids = [s[0] for s in enrolled_subjects]
                
                attendance_by_subject = {}
                if enrolled_subject_ids:
                    for subject_id in enrolled_subject_ids:
                        subject = db.query(SubjectModel).filter(SubjectModel.id == subject_id).first()
                        if not subject:
                            continue
                        
                        attendance_records = db.query(AttendanceModel).filter(
                            AttendanceModel.subject_id == subject_id
                        ).all()
                        
                        subject_attendance = {
                            'subject_id': subject_id,
                            'subject_name': subject.name,
                            'total_days': 0,
                            'present_days': 0,
                            'absent_days': 0,
                            'late_days': 0,
                            'sick_leave_days': 0
                        }
                        
                        for record in attendance_records:
                            try:
                                attendance_data = json.loads(record.present_json) if record.present_json else {}
                                student_id_str = str(student.id)
                                if student_id_str in attendance_data:
                                    status = attendance_data[student_id_str]
                                    subject_attendance['total_days'] += 1
                                    if status == 'present':
                                        subject_attendance['present_days'] += 1
                                    elif status == 'absent':
                                        subject_attendance['absent_days'] += 1
                                    elif status == 'late':
                                        subject_attendance['late_days'] += 1
                                    elif status == 'sick_leave':
                                        subject_attendance['sick_leave_days'] += 1
                            except:
                                pass
                        
                        attendance_by_subject[subject_id] = subject_attendance
                
                # Calculate overall attendance rate
                total_attendance_days = sum(s['total_days'] for s in attendance_by_subject.values())
                total_attendance_present = sum(s['present_days'] for s in attendance_by_subject.values())
                
                students_data.append({
                    'id': student.id,
                    'username': student.username,
                    'full_name': student.full_name,
                    'email': student.email,
                    'student_number': enrollment.student_number if hasattr(enrollment, 'student_number') else None,
                    'grades_by_subject': list(grades_by_subject.values()),
                    'attendance_by_subject': list(attendance_by_subject.values()),
                    'attendance': {
                        'attendance_rate': round((total_attendance_present / total_attendance_days * 100) if total_attendance_days > 0 else 0, 2),
                        'present_days': total_attendance_present,
                        'absent_days': sum(s['absent_days'] for s in attendance_by_subject.values()),
                        'late_days': sum(s['late_days'] for s in attendance_by_subject.values()),
                        'sick_leave_days': sum(s['sick_leave_days'] for s in attendance_by_subject.values())
                    }
                })
            
            result.append({
                'classroom_id': classroom.id,
                'classroom_name': classroom.name,
                'grade_level': classroom.grade_level,
                'student_count': len(students_data),
                'students': students_data
            })
    
    return {"classrooms": result, "academic_year": academic_year, "semester": semester}


@router.get("/my-classrooms/{classroom_id}/students")
def get_homeroom_classroom_students(
    classroom_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """ดึงรายละเอียดนักเรียนในชั้นเรียนที่ครูประจำ"""
    if current_user.role not in ['teacher', 'admin']:
        raise HTTPException(status_code=403, detail="ต้องเป็นครูหรือแอดมินเท่านั้น")
    
    # Verify this teacher is homeroom teacher for this classroom
    classroom = db.query(ClassroomModel).filter(ClassroomModel.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="ไม่พบชั้นเรียน")
    
    if current_user.role == 'teacher':
        homeroom = db.query(HomeroomTeacherModel).filter(
            HomeroomTeacherModel.teacher_id == current_user.id,
            HomeroomTeacherModel.school_id == classroom.school_id,
            or_(
                HomeroomTeacherModel.classroom_id == classroom.id,
                HomeroomTeacherModel.grade_level == classroom.grade_level
            ),
            or_(HomeroomTeacherModel.academic_year == None, HomeroomTeacherModel.academic_year == classroom.academic_year),
            or_(HomeroomTeacherModel.semester == None, HomeroomTeacherModel.semester == classroom.semester)
        ).first()
        
        if not homeroom:
            raise HTTPException(status_code=403, detail="คุณไม่ใช่ครูประจำชั้นของห้องเรียนนี้")
    
    # Get students in this classroom
    enrollments = db.query(ClassroomStudentModel, UserModel).join(
        UserModel, ClassroomStudentModel.student_id == UserModel.id
    ).filter(
        ClassroomStudentModel.classroom_id == classroom_id,
    ).all()
    
    students_data = []
    for enrollment, student in enrollments:
        # Get all grades for this student with subject details
        grades = db.query(GradeModel, SubjectModel).join(
            SubjectModel, GradeModel.subject_id == SubjectModel.id
        ).filter(
            GradeModel.student_id == student.id
        ).all()
        
        grades_by_subject = {}
        for grade, subject in grades:
            if subject.id not in grades_by_subject:
                grades_by_subject[subject.id] = {
                    'subject_id': subject.id,
                    'subject_name': subject.name,
                    'is_activity': subject.subject_type == 'activity',
                    'credits': subject.credits if hasattr(subject, 'credits') else None,
                    'activity_percentage': subject.activity_percentage if hasattr(subject, 'activity_percentage') and subject.activity_percentage is not None else 0,
                    'max_collected_score': subject.max_collected_score if hasattr(subject, 'max_collected_score') and subject.max_collected_score is not None else 100,
                    'max_exam_score': subject.max_exam_score if hasattr(subject, 'max_exam_score') and subject.max_exam_score is not None else 100,
                    'assignments': [],
                    'total_score': 0,
                    'total_max_score': 0
                }
            if grade.grade is not None and grade.max_score:
                grades_by_subject[subject.id]['assignments'].append({
                    'title': grade.title,
                    'score': float(grade.grade),
                    'max_score': float(grade.max_score)
                })
                grades_by_subject[subject.id]['total_score'] += float(grade.grade)
                grades_by_subject[subject.id]['total_max_score'] += float(grade.max_score)
        
        # Get attendance
        enrolled_subjects = db.query(SubjectStudentModel.subject_id).filter(
            SubjectStudentModel.student_id == student.id
        ).all()
        enrolled_subject_ids = [s[0] for s in enrolled_subjects]
        
        attendance_by_subject = {}
        if enrolled_subject_ids:
            for subject_id in enrolled_subject_ids:
                subject = db.query(SubjectModel).filter(SubjectModel.id == subject_id).first()
                if not subject:
                    continue
                    
                attendance_records = db.query(AttendanceModel).filter(
                    AttendanceModel.subject_id == subject_id
                ).all()
                
                subject_attendance = {
                    'subject_id': subject_id,
                    'subject_name': subject.name,
                    'total_days': 0,
                    'present_days': 0,
                    'absent_days': 0,
                    'late_days': 0,
                    'sick_leave_days': 0
                }
                
                for record in attendance_records:
                    try:
                        attendance_data = json.loads(record.present_json) if record.present_json else {}
                        student_id_str = str(student.id)
                        if student_id_str in attendance_data:
                            status = attendance_data[student_id_str]
                            subject_attendance['total_days'] += 1
                            if status == 'present':
                                subject_attendance['present_days'] += 1
                            elif status == 'absent':
                                subject_attendance['absent_days'] += 1
                            elif status == 'late':
                                subject_attendance['late_days'] += 1
                            elif status == 'sick_leave':
                                subject_attendance['sick_leave_days'] += 1
                    except:
                        pass
                
                attendance_by_subject[subject_id] = subject_attendance
        
        students_data.append({
            'id': student.id,
            'username': student.username,
            'full_name': student.full_name,
            'email': student.email,
            'student_number': enrollment.student_number if hasattr(enrollment, 'student_number') else None,
            'grades_by_subject': list(grades_by_subject.values()),
            'attendance_by_subject': list(attendance_by_subject.values())
        })
    
    return {
        'classroom_id': classroom.id,
        'classroom_name': classroom.name,
        'grade_level': classroom.grade_level,
        'students': students_data
    }
