from pydantic import BaseModel
from typing import List, Optional
from datetime import date


class AttendanceMark(BaseModel):
    subject_id: int
    date: Optional[date] = None
    present: List[int]


class AttendanceResponse(BaseModel):
    id: int
    subject_id: int
    date: date
    present: List[int]

    class Config:
        from_attributes = True
