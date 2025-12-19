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

class School(SchoolBase):
    id: int
    grade_announcement_date: Optional[datetime] = None
    class Config:
        # Pydantic v2 renamed 'orm_mode' -> 'from_attributes'
        # keep backward-compatible attribute for v1 style, prefer 'from_attributes'
        from_attributes = True