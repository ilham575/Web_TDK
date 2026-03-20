from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from schemas.user import User

class SubjectBase(BaseModel):
    name: str
    code: Optional[str] = None
    subject_type: Optional[str] = 'main'  # 'main' or 'activity'
    teacher_id: Optional[int] = None
    school_id: Optional[int] = None
    is_ended: Optional[bool] = False
    credits: Optional[int] = None
    activity_percentage: Optional[int] = None
    max_collected_score: Optional[int] = 100
    max_exam_score: Optional[int] = 100
    academic_year: Optional[str] = None
    semester: Optional[int] = None
    linked_subject_id: Optional[int] = None  # ID of the source subject this was copied from

class SubjectCreate(SubjectBase):
    pass

class SubjectUpdate(BaseModel):
    """For PATCH requests - all fields optional"""
    name: Optional[str] = None
    code: Optional[str] = None
    subject_type: Optional[str] = None
    teacher_id: Optional[int] = None
    school_id: Optional[int] = None
    is_ended: Optional[bool] = None
    credits: Optional[int] = None
    activity_percentage: Optional[int] = None
    max_collected_score: Optional[int] = None
    max_exam_score: Optional[int] = None
    academic_year: Optional[str] = None
    semester: Optional[int] = None
    linked_subject_id: Optional[int] = None

class Subject(SubjectBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    # optional teacher info if joined by server
    teacher_name: Optional[str] = None
    teacher: Optional['User'] = None  # may include full user object

    class Config:
        from_attributes = True

class SubjectTeacherBase(BaseModel):
    teacher_id: int
    classroom_id: Optional[int] = None  # None = teaches all classrooms, specific id = teaches only this classroom

class SubjectTeacherCreate(SubjectTeacherBase):
    pass

class SubjectTeacher(SubjectTeacherBase):
    id: int
    subject_id: int
    teacher_name: Optional[str] = None
    classroom_name: Optional[str] = None
    is_ended: Optional[bool] = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Update forward references so that 'teacher' field works
Subject.update_forward_refs()

