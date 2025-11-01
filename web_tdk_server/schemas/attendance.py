from pydantic import BaseModel
from typing import Dict, Optional


class AttendanceMark(BaseModel):
    subject_id: int
    date: Optional[str] = None  # YYYY-MM-DD format
    attendance: Dict[str, str]  # student_id -> status ("present", "absent", "sick_leave", "other")


class AttendanceResponse(BaseModel):
    id: int
    subject_id: int
    date: str  # YYYY-MM-DD format
    attendance: Dict[str, str]  # student_id -> status

    class Config:
        from_attributes = True
