from pydantic import BaseModel
from typing import List, Optional, Union
from datetime import date, time

class ScheduleSlotBase(BaseModel):
    # Accept string or int (0-6) as day_of_week for flexibility in clients
    day_of_week: Union[int, str]
    start_time: time
    end_time: time
    is_break: bool = False

class ScheduleSlotCreate(ScheduleSlotBase):
    pass

class ScheduleSlotUpdate(ScheduleSlotBase):
    pass

class ScheduleSlot(ScheduleSlotBase):
    id: int
    school_id: int
    created_by: int
    
    class Config:
        from_attributes = True

class SubjectScheduleBase(BaseModel):
    subject_id: int
    day_of_week: Union[int, str]  # Day of week (0-6, where 0=Sunday). Accepts int or string.
    start_time: time
    end_time: time
    schedule_slot_id: Optional[int] = None  # Optional reference to operating hours
    classroom_id: Optional[int] = None  # Specific classroom (optional - if None, applies to all)

class SubjectScheduleCreate(SubjectScheduleBase):
    pass

class SubjectSchedule(SubjectScheduleBase):
    id: int
    subject_id: Optional[int] = None
    teacher_id: Optional[int] = None
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    teacher_name: Optional[str] = None
    classroom_name: Optional[str] = None  # Display classroom name if assigned
    academic_year: Optional[str] = None
    semester: Optional[int] = None
    note: Optional[str] = None
    is_break: bool = False
    is_free_period: bool = False
    holiday_id: Optional[int] = None
    is_holiday: bool = False
    scope_label: Optional[str] = None

    # Make day/time optional in responses to support legacy rows without explicit times
    day_of_week: Optional[Union[int, str]] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    
    class Config:
        from_attributes = True

class StudentScheduleResponse(BaseModel):
    id: int
    subject_id: Optional[int] = None
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    teacher_name: Optional[str] = None
    # Make day/time optional for robust responses when schedules lack explicit times
    day_of_week: Optional[str] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    note: Optional[str] = None
    is_break: bool = False
    is_free_period: bool = False
    holiday_id: Optional[int] = None
    is_holiday: bool = False
    scope_label: Optional[str] = None
    
    class Config:
        from_attributes = True


class DailySubjectTrackingUpsert(BaseModel):
    tracking_date: date
    actual_start_time: Optional[time] = None
    actual_end_time: Optional[time] = None
    is_skipped: bool = False
    note: Optional[str] = None


class DailySubjectTrackingBulkItemUpsert(BaseModel):
    subject_schedule_id: Optional[int] = None
    break_schedule_id: Optional[int] = None
    tracking_date: Optional[date] = None
    actual_start_time: Optional[time] = None
    actual_end_time: Optional[time] = None
    is_skipped: bool = False
    note: Optional[str] = None


class DailySubjectTrackingBulkUpsert(BaseModel):
    tracking_date: Optional[date] = None
    updates: List[DailySubjectTrackingBulkItemUpsert]


class DailySubjectTrackingResponse(BaseModel):
    tracking_id: Optional[int] = None
    subject_schedule_id: Union[int, str]
    break_schedule_id: Optional[int] = None
    holiday_id: Optional[int] = None
    tracking_date: date
    subject_id: Optional[int] = None
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    teacher_id: Optional[int] = None
    teacher_name: Optional[str] = None
    classroom_id: Optional[int] = None
    classroom_name: Optional[str] = None
    academic_year: Optional[str] = None
    semester: Optional[int] = None
    day_of_week: Optional[str] = None
    scheduled_start_time: Optional[time] = None
    scheduled_end_time: Optional[time] = None
    actual_start_time: Optional[time] = None
    actual_end_time: Optional[time] = None
    is_skipped: bool = False
    note: Optional[str] = None
    can_edit: bool = False
    is_break: bool = False
    is_holiday: bool = False
    scope_label: Optional[str] = None

    class Config:
        from_attributes = True


class SchoolHolidayBase(BaseModel):
    holiday_date: date
    note: Optional[str] = None


class SchoolHolidayCreate(SchoolHolidayBase):
    pass


class SchoolHolidayResponse(SchoolHolidayBase):
    id: int
    school_id: int
    created_by: int

    class Config:
        from_attributes = True


class BreakScheduleBase(BaseModel):
    academic_year: str
    semester: int
    day_of_week: Union[int, str]
    start_time: time
    end_time: time
    classroom_id: Optional[int] = None
    note: Optional[str] = None


class BreakScheduleCreate(BreakScheduleBase):
    pass


class BreakScheduleUpdate(BreakScheduleBase):
    pass


class BreakSchedule(BreakScheduleBase):
    id: int
    school_id: int
    created_by: int
    is_break: bool = True
    classroom_name: Optional[str] = None
    scope_label: Optional[str] = None

    class Config:
        from_attributes = True