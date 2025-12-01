from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ===== Classroom Schemas =====

class ClassroomCreate(BaseModel):
    """สร้างชั้นเรียนใหม่"""
    name: str  # เช่น "ป.1/1"
    grade_level: str  # เช่น "ป.1"
    room_number: Optional[str] = None  # ห้อง เช่น "1", "2"
    semester: int = 1  # เทอม 1 หรือ 2
    academic_year: str  # ปีการศึกษา เช่น "2567"
    school_id: int
    has_multiple_rooms: bool = False  # มีหลายห้องหรือไม่


class ClassroomUpdate(BaseModel):
    """อัปเดตชั้นเรียน"""
    name: Optional[str] = None
    room_number: Optional[str] = None
    semester: Optional[int] = None
    is_active: Optional[bool] = None


class ClassroomResponse(BaseModel):
    """ข้อมูลชั้นเรียนที่ส่งกลับ"""
    id: int
    name: str
    grade_level: str
    room_number: Optional[str]
    semester: int
    academic_year: str
    school_id: int
    is_active: bool
    parent_classroom_id: Optional[int]
    student_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ClassroomListResponse(BaseModel):
    """รายการชั้นเรียน"""
    id: int
    name: str
    grade_level: str
    room_number: Optional[str]
    semester: int
    academic_year: str
    student_count: int
    is_active: bool


# ===== Classroom Student Schemas =====

class AddStudentsRequest(BaseModel):
    """เพิ่มนักเรียนเข้าชั้นเรียน"""
    student_ids: List[int]


class AddStudentsResponse(BaseModel):
    """ผลการเพิ่มนักเรียน"""
    added_count: int
    already_enrolled: List[int] = []
    errors: List[str] = []


class StudentInClassroom(BaseModel):
    """ข้อมูลนักเรียนในชั้นเรียน"""
    id: int
    student_id: int
    full_name: str
    username: str
    email: str
    is_active: bool


# ===== Promotion Schemas =====

class PromoteClassroomRequest(BaseModel):
    """เลื่อนชั้นเรียน"""
    promotion_type: str  # "mid_term" หรือ "end_of_year"
    new_grade_level: Optional[str] = None  # จำเป็นถ้าเป็น end_of_year
    new_academic_year: Optional[str] = None  # ใช้สำหรับ end_of_year
    include_grades: bool = True  # ดึงคะแนนมาด้วยหรือไม่


class PromoteClassroomResponse(BaseModel):
    """ผลการเลื่อนชั้น"""
    message: str
    new_classroom_id: int
    new_classroom_name: str
    promoted_students: int
    grades_copied: int = 0


# ===== Bulk Operations =====

class BulkClassroomCreate(BaseModel):
    """สร้างหลายห้องพร้อมกัน"""
    grade_level: str
    rooms: List[str]  # เช่น ["1", "2", "3"] หรือ ["A", "B"]
    semester: int = 1
    academic_year: str
    school_id: int
