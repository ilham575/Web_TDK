from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class SchoolBase(BaseModel):
    name: str
    logo_url: Optional[str] = None

class SchoolCreate(SchoolBase):
    pass

class SchoolUpdate(BaseModel):
    name: Optional[str] = None
    logo_url: Optional[str] = None
    grade_announcement_date: Optional[datetime] = None
    can_teacher_view_summary: Optional[int] = None
    is_grade_announced: Optional[int] = None
    is_view_grades_by_year_semester: Optional[bool] = None
    is_academic_year_setup: Optional[bool] = None
    current_academic_year: Optional[str] = None
    current_semester: Optional[int] = None


class AcademicYearSetup(BaseModel):
    academic_year: str
    semester: int


class School(SchoolBase):
    id: int
    grade_announcement_date: Optional[datetime] = None
    can_teacher_view_summary: int = 0
    is_grade_announced: int = 0
    is_view_grades_by_year_semester: bool = False
    is_academic_year_setup: bool = False
    current_academic_year: Optional[str] = None
    current_semester: Optional[int] = None
    class Config:
        # Pydantic v2 renamed 'orm_mode' -> 'from_attributes'
        # keep backward-compatible attribute for v1 style, prefer 'from_attributes'
        from_attributes = True