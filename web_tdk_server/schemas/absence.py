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
    absence_type: AbsenceTypeEnum = AbsenceTypeEnum.PERSONAL
    reason: Optional[str] = None

    class Config:
        use_enum_values = True


class AbsenceUpdate(BaseModel):
    absence_type: Optional[AbsenceTypeEnum] = None
    reason: Optional[str] = None
    status: Optional[AbsenceStatusEnum] = None

    class Config:
        use_enum_values = True


class AbsenceResponse(BaseModel):
    id: int
    student_id: int
    subject_id: Optional[int] = None
    absence_date: date
    absence_type: AbsenceTypeEnum
    reason: Optional[str] = None
    status: AbsenceStatusEnum
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        use_enum_values = True
