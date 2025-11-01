from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class SubjectBase(BaseModel):
    name: str
    teacher_id: Optional[int] = None
    school_id: Optional[int] = None
    is_ended: Optional[bool] = False

class SubjectCreate(SubjectBase):
    pass

class Subject(SubjectBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
