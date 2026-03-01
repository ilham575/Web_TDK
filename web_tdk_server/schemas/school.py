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

class School(SchoolBase):
    id: int
    grade_announcement_date: Optional[datetime] = None
    can_teacher_view_summary: int = 0
    is_grade_announced: int = 0
    class Config:
        # Pydantic v2 renamed 'orm_mode' -> 'from_attributes'
        # keep backward-compatible attribute for v1 style, prefer 'from_attributes'
        from_attributes = True