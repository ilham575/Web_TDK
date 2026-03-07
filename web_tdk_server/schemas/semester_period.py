from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class SemesterPeriodBase(BaseModel):
    academic_year: str
    semester: int
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class SemesterPeriodCreate(SemesterPeriodBase):
    school_id: int


class SemesterPeriodUpdate(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class SemesterPeriodResponse(SemesterPeriodBase):
    id: int
    school_id: int
    is_auto_closed: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
