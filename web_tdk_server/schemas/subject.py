from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class SubjectBase(BaseModel):
    name: str
    code: Optional[str] = None
    subject_type: Optional[str] = 'main'  # 'main' or 'activity'
    teacher_id: Optional[int] = None
    school_id: Optional[int] = None
    is_ended: Optional[bool] = False
    credits: Optional[int] = None
    activity_percentage: Optional[int] = None

class SubjectCreate(SubjectBase):
    pass

class Subject(SubjectBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

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

