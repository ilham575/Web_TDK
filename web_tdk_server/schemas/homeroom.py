from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class HomeroomTeacherBase(BaseModel):
    teacher_id: int
    grade_level: Optional[str] = None
    classroom_id: Optional[int] = None
    school_id: int
    academic_year: Optional[str] = None

class HomeroomTeacherCreate(HomeroomTeacherBase):
    pass

class HomeroomTeacherUpdate(BaseModel):
    teacher_id: Optional[int] = None
    grade_level: Optional[str] = None
    classroom_id: Optional[int] = None
    academic_year: Optional[str] = None

class HomeroomTeacher(HomeroomTeacherBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class HomeroomTeacherWithDetails(HomeroomTeacher):
    """Extended schema with teacher details"""
    teacher_name: Optional[str] = None
    teacher_email: Optional[str] = None
    student_count: Optional[int] = 0
    classroom_name: Optional[str] = None


class HomeroomCopyRequest(BaseModel):
    school_id: Optional[int] = None
    from_year: str
    to_year: str
