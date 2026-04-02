from pydantic import BaseModel
from typing import Optional

class SchoolAccessControlBase(BaseModel):
    academic_year: str
    semester: int
    allow_teacher_view_summary: bool = False
    allow_student_view_grades: bool = False
    allow_student_view_ranking: bool = False

class SchoolAccessControlCreate(SchoolAccessControlBase):
    school_id: int

class SchoolAccessControlUpdate(BaseModel):
    allow_teacher_view_summary: Optional[bool] = None
    allow_student_view_grades: Optional[bool] = None
    allow_student_view_ranking: Optional[bool] = None

class SchoolAccessControl(SchoolAccessControlBase):
    id: int
    school_id: int

    class Config:
        from_attributes = True
