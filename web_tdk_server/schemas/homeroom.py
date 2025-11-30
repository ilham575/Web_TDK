from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class HomeroomTeacherBase(BaseModel):
    teacher_id: int
    grade_level: str
    school_id: int
    academic_year: Optional[str] = None

class HomeroomTeacherCreate(HomeroomTeacherBase):
    pass

class HomeroomTeacherUpdate(BaseModel):
    teacher_id: Optional[int] = None
    grade_level: Optional[str] = None
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
