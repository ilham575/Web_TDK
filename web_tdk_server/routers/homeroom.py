from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from typing import List, Optional

from schemas.homeroom import HomeroomTeacher, HomeroomTeacherCreate, HomeroomTeacherUpdate, HomeroomTeacherWithDetails
from models.homeroom import HomeroomTeacher as HomeroomTeacherModel
from models.user import User as UserModel
from database.connection import get_db
from routers.user import get_current_user

router = APIRouter(prefix="/homeroom", tags=["homeroom"])


@router.get("", response_model=List[HomeroomTeacherWithDetails])
@router.get("/", response_model=List[HomeroomTeacherWithDetails])
def get_homeroom_teachers(
    school_id: Optional[int] = None,
    academic_year: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """ดึงรายชื่อครูประจำชั้นทั้งหมด"""
    query = db.query(HomeroomTeacherModel)
    
    # Filter by school_id
    if school_id:
        query = query.filter(HomeroomTeacherModel.school_id == school_id)
    elif current_user.school_id:
        query = query.filter(HomeroomTeacherModel.school_id == current_user.school_id)
    
    # Filter by academic_year if provided
    if academic_year:
        query = query.filter(HomeroomTeacherModel.academic_year == academic_year)
    
    homerooms = query.all()
    
    # Enrich with teacher details and student count
    result = []
    for hr in homerooms:
        teacher = db.query(UserModel).filter(UserModel.id == hr.teacher_id).first()
        
        # Count students in this grade level at this school
        student_count = db.query(UserModel).filter(
            UserModel.role == 'student',
            UserModel.school_id == hr.school_id,
            UserModel.grade_level == hr.grade_level,
            UserModel.is_active == True
        ).count()
        
        result.append(HomeroomTeacherWithDetails(
            id=hr.id,
            teacher_id=hr.teacher_id,
            grade_level=hr.grade_level,
            school_id=hr.school_id,
            academic_year=hr.academic_year,
            created_at=hr.created_at,
            updated_at=hr.updated_at,
            teacher_name=teacher.full_name if teacher else None,
            teacher_email=teacher.email if teacher else None,
            student_count=student_count
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
        created_at=hr.created_at,
        updated_at=hr.updated_at,
        teacher_name=teacher.full_name if teacher else None,
        teacher_email=teacher.email if teacher else None,
        student_count=student_count
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
    
    # Check if this teacher is already assigned to another class for this school/year
    existing = db.query(HomeroomTeacherModel).filter(
        HomeroomTeacherModel.teacher_id == homeroom.teacher_id,
        HomeroomTeacherModel.school_id == homeroom.school_id,
        HomeroomTeacherModel.academic_year == homeroom.academic_year
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400, 
            detail=f"ครูท่านนี้มีการประจำชั้นอยู่แล้ว (ชั้น {existing.grade_level}) ครูสามารถประจำชั้นได้เพียงแค่ 1 ห้องเท่านั้น"
        )
    
    # Create homeroom teacher assignment
    db_homeroom = HomeroomTeacherModel(
        teacher_id=homeroom.teacher_id,
        grade_level=homeroom.grade_level,
        school_id=homeroom.school_id,
        academic_year=homeroom.academic_year
    )
    
    db.add(db_homeroom)
    db.commit()
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
            HomeroomTeacherModel.academic_year == hr.academic_year,
            HomeroomTeacherModel.id != homeroom_id
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"ครูท่านนี้มีการประจำชั้นอยู่แล้ว (ชั้น {existing.grade_level}) ครูสามารถประจำชั้นได้เพียงแค่ 1 ห้องเท่านั้น"
            )
    
    for key, value in update_data.items():
        setattr(hr, key, value)
    
    db.commit()
    db.refresh(hr)
    
    return hr


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
