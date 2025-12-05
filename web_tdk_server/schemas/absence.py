from pydantic import BaseModel
from typing import Optional
from enum import Enum
from datetime import date, datetime


class AbsenceTypeEnum(str, Enum):
    SICK = "sick"
    PERSONAL = "personal"
    OTHER = "other"


class AbsenceStatusEnum(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class AbsenceCreate(BaseModel):
    subject_id: Optional[int] = None
    absence_date: date
    absence_date_end: Optional[date] = None  # End date for multi-day absence
    days_count: Optional[int] = 1  # Number of days
    absence_type: AbsenceTypeEnum = AbsenceTypeEnum.PERSONAL
    reason: Optional[str] = None

    class Config:
        use_enum_values = True


class AbsenceUpdate(BaseModel):
    # Allow students to update type/reason and (optionally) dates/subject when editing
    absence_type: Optional[AbsenceTypeEnum] = None
    reason: Optional[str] = None
    # Optional fields for changing the absence dates/subject/count
    absence_date: Optional[date] = None
    absence_date_end: Optional[date] = None
    days_count: Optional[int] = None
    subject_id: Optional[int] = None
    # Status and rejection info are primarily for approvers, but kept optional
    status: Optional[AbsenceStatusEnum] = None
    reject_reason: Optional[str] = None
    version: Optional[int] = None  # สำหรับ optimistic locking

    class Config:
        use_enum_values = True


class AbsenceResponse(BaseModel):
    id: int
    student_id: int
    student_name: Optional[str] = None  # ชื่อนักเรียน
    subject_id: Optional[int] = None
    subject_name: Optional[str] = None  # ชื่อวิชา
    absence_date: date
    absence_date_end: Optional[date] = None  # End date for multi-day
    days_count: int = 1  # Number of days
    absence_type: AbsenceTypeEnum
    reason: Optional[str] = None
    status: AbsenceStatusEnum
    
    # Approval info
    approved_by: Optional[int] = None
    approver_name: Optional[str] = None  # ชื่อผู้อนุมัติ
    approver_role: Optional[str] = None  # 'admin' หรือ 'teacher'
    approved_at: Optional[datetime] = None
    reject_reason: Optional[str] = None
    version: int = 1
    
    created_at: datetime
    updated_at: datetime
    announcement_id: Optional[int] = None

    class Config:
        from_attributes = True
        use_enum_values = True
