from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List, Optional
from database.connection import get_db
from models.classroom import Classroom, ClassroomStudent
from models.user import User
from models.grade import Grade
from schemas.classroom import (
    ClassroomCreate,
    ClassroomUpdate,
    ClassroomResponse,
    ClassroomListResponse,
    AddStudentsRequest,
    AddStudentsResponse,
    StudentInClassroom,
    PromoteClassroomRequest,
    PromoteClassroomResponse,
    BulkClassroomCreate
)
from utils.security import get_current_user

router = APIRouter(prefix="/classrooms", tags=["classrooms"])


# ===== Helper Functions =====

def verify_admin_or_owner(current_user: User):
    """ตรวจสอบว่าเป็น admin หรือ owner"""
    if current_user.role not in ["admin", "owner"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ต้องเป็น Admin หรือ Owner เท่านั้น"
        )


def get_classroom_or_404(classroom_id: int, db: Session) -> Classroom:
    """ดึงชั้นเรียนหรือ 404"""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ไม่พบชั้นเรียน"
        )
    return classroom


# ===== Classroom CRUD =====

@router.post("/create", response_model=ClassroomResponse)
async def create_classroom(
    data: ClassroomCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    สร้างชั้นเรียนใหม่
    - ถ้าเป็นห้องเดียว: name จะเป็น grade_level เลย เช่น "ป.1"
    - ถ้าหลายห้อง: name จะเป็น grade_level/room_number เช่น "ป.1/1"
    """
    verify_admin_or_owner(current_user)

    # ตรวจสอบว่ามีชั้นเรียนซ้ำหรือไม่ (ชื่อเดียวกัน กับเทอม ปี โรงเรียนเดียวกัน)
    existing = db.query(Classroom).filter(
        and_(
            Classroom.name == data.name,
            Classroom.grade_level == data.grade_level,
            Classroom.school_id == data.school_id,
            Classroom.semester == data.semester,
            Classroom.academic_year == data.academic_year,
            Classroom.is_active == True
        )
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"ชั้นเรียน '{data.name}' ({data.grade_level}) เทอม {data.semester} ปีการศึกษา {data.academic_year} มีอยู่แล้ว"
        )

    try:
        classroom = Classroom(
            name=data.name,
            grade_level=data.grade_level,
            room_number=data.room_number,
            semester=data.semester,
            academic_year=data.academic_year,
            school_id=data.school_id
        )

        db.add(classroom)
        db.commit()
        db.refresh(classroom)

        return ClassroomResponse(
            id=classroom.id,
            name=classroom.name,
            grade_level=classroom.grade_level,
            room_number=classroom.room_number,
            semester=classroom.semester,
            academic_year=classroom.academic_year,
            school_id=classroom.school_id,
            is_active=classroom.is_active,
            parent_classroom_id=classroom.parent_classroom_id,
            student_count=0,
            created_at=classroom.created_at,
            updated_at=classroom.updated_at
        )
    except Exception as e:
        db.rollback()
        if "Duplicate entry" in str(e) or "UNIQUE" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"ชั้นเรียน '{data.name}' มีอยู่แล้ว กรุณาตรวจสอบชื่อชั้นเรียนและรายละเอียด"
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/bulk-create", response_model=List[ClassroomResponse])
async def bulk_create_classrooms(
    data: BulkClassroomCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """สร้างหลายห้องพร้อมกัน เช่น ป.1/1, ป.1/2, ป.1/3"""
    verify_admin_or_owner(current_user)

    created_classrooms = []

    for room in data.rooms:
        name = f"{data.grade_level}/{room}"

        # ตรวจสอบซ้ำ
        existing = db.query(Classroom).filter(
            and_(
                Classroom.name == name,
                Classroom.school_id == data.school_id,
                Classroom.semester == data.semester,
                Classroom.academic_year == data.academic_year,
                Classroom.is_active == True
            )
        ).first()

        if existing:
            continue  # ข้ามถ้ามีอยู่แล้ว

        classroom = Classroom(
            name=name,
            grade_level=data.grade_level,
            room_number=room,
            semester=data.semester,
            academic_year=data.academic_year,
            school_id=data.school_id
        )

        db.add(classroom)
        created_classrooms.append(classroom)

    db.commit()

    # Refresh และ return
    result = []
    for c in created_classrooms:
        db.refresh(c)
        result.append(ClassroomResponse(
            id=c.id,
            name=c.name,
            grade_level=c.grade_level,
            room_number=c.room_number,
            semester=c.semester,
            academic_year=c.academic_year,
            school_id=c.school_id,
            is_active=c.is_active,
            parent_classroom_id=c.parent_classroom_id,
            student_count=0,
            created_at=c.created_at,
            updated_at=c.updated_at
        ))

    return result


@router.get("/list/{school_id}", response_model=List[ClassroomListResponse])
async def list_classrooms(
    school_id: int,
    semester: Optional[int] = None,
    academic_year: Optional[str] = None,
    grade_level: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """ดึงรายการชั้นเรียนทั้งหมดของโรงเรียน"""
    query = db.query(Classroom).filter(
        Classroom.school_id == school_id,
        Classroom.is_active == True
    )

    if semester:
        query = query.filter(Classroom.semester == semester)
    if academic_year:
        query = query.filter(Classroom.academic_year == academic_year)
    if grade_level:
        query = query.filter(Classroom.grade_level == grade_level)

    classrooms = query.order_by(Classroom.grade_level, Classroom.room_number).all()

    result = []
    for c in classrooms:
        student_count = db.query(ClassroomStudent).filter(
            ClassroomStudent.classroom_id == c.id,
            ClassroomStudent.is_active == True
        ).count()

        result.append(ClassroomListResponse(
            id=c.id,
            name=c.name,
            grade_level=c.grade_level,
            room_number=c.room_number,
            semester=c.semester,
            academic_year=c.academic_year,
            student_count=student_count,
            is_active=c.is_active
        ))

    return result


@router.get("/{classroom_id}", response_model=ClassroomResponse)
async def get_classroom(
    classroom_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """ดึงข้อมูลชั้นเรียน"""
    classroom = get_classroom_or_404(classroom_id, db)

    student_count = db.query(ClassroomStudent).filter(
        ClassroomStudent.classroom_id == classroom.id,
        ClassroomStudent.is_active == True
    ).count()

    return ClassroomResponse(
        id=classroom.id,
        name=classroom.name,
        grade_level=classroom.grade_level,
        room_number=classroom.room_number,
        semester=classroom.semester,
        academic_year=classroom.academic_year,
        school_id=classroom.school_id,
        is_active=classroom.is_active,
        parent_classroom_id=classroom.parent_classroom_id,
        student_count=student_count,
        created_at=classroom.created_at,
        updated_at=classroom.updated_at
    )


@router.put("/{classroom_id}", response_model=ClassroomResponse)
async def update_classroom_put(
    classroom_id: int,
    data: ClassroomUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """อัปเดตข้อมูลชั้นเรียน (PUT)"""
    verify_admin_or_owner(current_user)
    classroom = get_classroom_or_404(classroom_id, db)

    try:
        if data.name is not None:
            classroom.name = data.name
        if data.grade_level is not None:
            classroom.grade_level = data.grade_level
        if data.room_number is not None:
            classroom.room_number = data.room_number
        if data.semester is not None:
            classroom.semester = data.semester
        if data.is_active is not None:
            classroom.is_active = data.is_active

        db.commit()
        db.refresh(classroom)

        student_count = db.query(ClassroomStudent).filter(
            ClassroomStudent.classroom_id == classroom.id,
            ClassroomStudent.is_active == True
        ).count()

        return ClassroomResponse(
            id=classroom.id,
            name=classroom.name,
            grade_level=classroom.grade_level,
            room_number=classroom.room_number,
            semester=classroom.semester,
            academic_year=classroom.academic_year,
            school_id=classroom.school_id,
            is_active=classroom.is_active,
            parent_classroom_id=classroom.parent_classroom_id,
            student_count=student_count,
            created_at=classroom.created_at,
            updated_at=classroom.updated_at
        )
    except Exception as e:
        db.rollback()
        if "Duplicate entry" in str(e) or "UNIQUE" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"ชั้นเรียน '{data.name}' มีอยู่แล้ว กรุณาตรวจสอบชื่อชั้นเรียนและรายละเอียด"
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.patch("/{classroom_id}", response_model=ClassroomResponse)
async def update_classroom(
    classroom_id: int,
    data: ClassroomUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """อัปเดตข้อมูลชั้นเรียน (PATCH)"""
    verify_admin_or_owner(current_user)
    classroom = get_classroom_or_404(classroom_id, db)

    try:
        if data.name is not None:
            classroom.name = data.name
        if data.room_number is not None:
            classroom.room_number = data.room_number
        if data.semester is not None:
            classroom.semester = data.semester
        if data.is_active is not None:
            classroom.is_active = data.is_active

        db.commit()
        db.refresh(classroom)

        student_count = db.query(ClassroomStudent).filter(
            ClassroomStudent.classroom_id == classroom.id,
            ClassroomStudent.is_active == True
        ).count()

        return ClassroomResponse(
            id=classroom.id,
            name=classroom.name,
            grade_level=classroom.grade_level,
            room_number=classroom.room_number,
            semester=classroom.semester,
            academic_year=classroom.academic_year,
            school_id=classroom.school_id,
            is_active=classroom.is_active,
            parent_classroom_id=classroom.parent_classroom_id,
            student_count=student_count,
            created_at=classroom.created_at,
            updated_at=classroom.updated_at
        )
    except Exception as e:
        db.rollback()
        if "Duplicate entry" in str(e) or "UNIQUE" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"ชั้นเรียน '{data.name}' มีอยู่แล้ว"
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.delete("/{classroom_id}")
async def delete_classroom(
    classroom_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """ลบชั้นเรียน (hard delete)"""
    verify_admin_or_owner(current_user)
    classroom = get_classroom_or_404(classroom_id, db)

    db.delete(classroom)
    db.commit()

    return {"message": "ลบชั้นเรียนเรียบร้อยแล้ว"}


# ===== Student Management =====

@router.post("/{classroom_id}/add-students", response_model=AddStudentsResponse)
async def add_students_to_classroom(
    classroom_id: int,
    student_ids: List[int],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """เพิ่มนักเรียนเข้าชั้นเรียน"""
    verify_admin_or_owner(current_user)
    classroom = get_classroom_or_404(classroom_id, db)

    added_count = 0
    already_enrolled = []
    errors = []

    for student_id in student_ids:
        # ตรวจสอบว่ามีนักเรียนนี้หรือไม่
        student = db.query(User).filter(
            User.id == student_id,
            User.role == "student"
        ).first()

        if not student:
            errors.append(f"ไม่พบนักเรียน ID {student_id}")
            continue

        # ตรวจสอบว่าลงทะเบียนแล้วหรือยัง
        existing = db.query(ClassroomStudent).filter(
            ClassroomStudent.classroom_id == classroom_id,
            ClassroomStudent.student_id == student_id
        ).first()

        if existing:
            if existing.is_active:
                already_enrolled.append(student_id)
            else:
                # Re-activate - ใช้ update() เพื่อหลีกเลี่ยงปัญหา SQLAlchemy setting all columns
                db.query(ClassroomStudent).filter(
                    ClassroomStudent.id == existing.id
                ).update({
                    ClassroomStudent.is_active: True
                })
                added_count += 1
            continue

        # เพิ่มนักเรียนใหม่
        enrollment = ClassroomStudent(
            classroom_id=classroom_id,
            student_id=student_id
        )
        db.add(enrollment)
        
        # อัปเดต grade_level ของนักเรียน
        student.grade_level = classroom.grade_level
        
        added_count += 1

    db.commit()

    return AddStudentsResponse(
        added_count=added_count,
        already_enrolled=already_enrolled,
        errors=errors
    )


@router.get("/{classroom_id}/students", response_model=List[StudentInClassroom])
async def get_students_in_classroom(
    classroom_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """ดึงรายชื่อนักเรียนในชั้นเรียน"""
    classroom = get_classroom_or_404(classroom_id, db)

    enrollments = db.query(ClassroomStudent, User).join(
        User, ClassroomStudent.student_id == User.id
    ).filter(
        ClassroomStudent.classroom_id == classroom_id,
        ClassroomStudent.is_active == True
    ).all()

    result = []
    for enrollment, student in enrollments:
        result.append(StudentInClassroom(
            id=enrollment.id,
            student_id=student.id,
            full_name=student.full_name,
            username=student.username,
            email=student.email,
            is_active=student.is_active
        ))

    return result


@router.delete("/{classroom_id}/students/{student_id}")
async def remove_student_from_classroom(
    classroom_id: int,
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """ลบนักเรียนออกจากชั้นเรียน"""
    verify_admin_or_owner(current_user)

    enrollment = db.query(ClassroomStudent).filter(
        ClassroomStudent.classroom_id == classroom_id,
        ClassroomStudent.student_id == student_id
    ).first()

    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ไม่พบนักเรียนในชั้นเรียนนี้"
        )

    enrollment.is_active = False
    db.commit()

    return {"message": "ลบนักเรียนออกจากชั้นเรียนเรียบร้อยแล้ว"}


# ===== Classroom Promotion =====

@router.post("/{classroom_id}/promote", response_model=PromoteClassroomResponse)
async def promote_classroom(
    classroom_id: int,
    data: PromoteClassroomRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    เลื่อนชั้นเรียน
    
    - mid_term: เลื่อนจากเทอม 1 ไปเทอม 2 (ปีการศึกษาเดียวกัน)
      - สร้างชั้นเรียนใหม่ในเทอม 2
      - คัดลอกนักเรียนทั้งหมด
      - ดึงคะแนนเทอม 1 มาเก็บไว้ (reference)
    
    - end_of_year: เลื่อนชั้นปลายปี
      - สร้างชั้นเรียนใหม่ในปีการศึกษาถัดไป เทอม 1
      - เปลี่ยน grade_level เป็นชั้นใหม่
      - คัดลอกนักเรียนทั้งหมด
    """
    verify_admin_or_owner(current_user)
    classroom = get_classroom_or_404(classroom_id, db)

    if data.promotion_type not in ["mid_term", "end_of_year"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="promotion_type ต้องเป็น 'mid_term' หรือ 'end_of_year'"
        )

    # กำหนดค่าสำหรับชั้นเรียนใหม่
    if data.promotion_type == "mid_term":
        if classroom.semester == 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="ชั้นเรียนนี้อยู่เทอม 2 แล้ว ไม่สามารถเลื่อนกลางปีได้"
            )
        
        new_semester = 2
        new_academic_year = classroom.academic_year
        new_grade_level = classroom.grade_level
        new_room = classroom.room_number
        new_name = classroom.name if not classroom.room_number else f"{classroom.grade_level}/{classroom.room_number}"

    else:  # end_of_year
        if not data.new_grade_level:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="ต้องระบุ new_grade_level สำหรับการเลื่อนชั้นปลายปี"
            )
        
        new_semester = 1
        new_academic_year = data.new_academic_year or str(int(classroom.academic_year) + 1)
        new_grade_level = data.new_grade_level
        new_room = classroom.room_number
        new_name = new_grade_level if not new_room else f"{new_grade_level}/{new_room}"

    # ตรวจสอบว่ามีชั้นเรียนปลายทางอยู่แล้วหรือไม่
    existing = db.query(Classroom).filter(
        and_(
            Classroom.name == new_name,
            Classroom.school_id == classroom.school_id,
            Classroom.semester == new_semester,
            Classroom.academic_year == new_academic_year,
            Classroom.is_active == True
        )
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"ชั้นเรียน {new_name} เทอม {new_semester} ปี {new_academic_year} มีอยู่แล้ว"
        )

    # สร้างชั้นเรียนใหม่
    new_classroom = Classroom(
        name=new_name,
        grade_level=new_grade_level,
        room_number=new_room,
        semester=new_semester,
        academic_year=new_academic_year,
        school_id=classroom.school_id,
        parent_classroom_id=classroom.id  # อ้างอิงชั้นเรียนเดิม
    )

    db.add(new_classroom)
    db.flush()  # เพื่อให้ได้ new_classroom.id

    # คัดลอกนักเรียน
    students = db.query(ClassroomStudent).filter(
        ClassroomStudent.classroom_id == classroom_id,
        ClassroomStudent.is_active == True
    ).all()

    promoted_students = 0
    grades_copied = 0

    for enrollment in students:
        # เพิ่มนักเรียนเข้าชั้นเรียนใหม่
        new_enrollment = ClassroomStudent(
            classroom_id=new_classroom.id,
            student_id=enrollment.student_id
        )
        db.add(new_enrollment)

        # อัปเดต grade_level ของนักเรียน
        student = db.query(User).filter(User.id == enrollment.student_id).first()
        if student:
            student.grade_level = new_grade_level
        
        promoted_students += 1

        # ถ้าเลือก include_grades - เก็บ reference ไว้ (คะแนนยังอยู่ในตาราง grades)
        # ไม่จำเป็นต้องคัดลอก เพราะสามารถดึงจาก parent_classroom_id ได้
        if data.include_grades:
            # นับจำนวนคะแนนที่มี
            grade_count = db.query(Grade).filter(
                Grade.student_id == enrollment.student_id
            ).count()
            grades_copied += grade_count

    db.commit()

    return PromoteClassroomResponse(
        message=f"เลื่อนชั้นเรียนสำเร็จ: {classroom.name} → {new_name}",
        new_classroom_id=new_classroom.id,
        new_classroom_name=new_name,
        promoted_students=promoted_students,
        grades_copied=grades_copied
    )


@router.get("/{classroom_id}/grades-from-previous")
async def get_grades_from_previous_term(
    classroom_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    ดึงคะแนนจากเทอมก่อนหน้า (ผ่าน parent_classroom_id)
    """
    classroom = get_classroom_or_404(classroom_id, db)

    if not classroom.parent_classroom_id:
        return {
            "message": "ชั้นเรียนนี้ไม่มีข้อมูลชั้นเรียนก่อนหน้า",
            "grades": []
        }

    # ดึงนักเรียนในชั้นเรียนปัจจุบัน
    student_ids = [
        e.student_id for e in db.query(ClassroomStudent).filter(
            ClassroomStudent.classroom_id == classroom_id,
            ClassroomStudent.is_active == True
        ).all()
    ]

    # ดึงคะแนนของนักเรียนเหล่านี้
    grades = db.query(Grade).filter(
        Grade.student_id.in_(student_ids)
    ).all()

    return {
        "parent_classroom_id": classroom.parent_classroom_id,
        "grades": [
            {
                "id": g.id,
                "student_id": g.student_id,
                "subject_id": g.subject_id,
                "title": g.title,
                "max_score": g.max_score,
                "grade": g.grade,
                "created_at": g.created_at
            }
            for g in grades
        ]
    }
