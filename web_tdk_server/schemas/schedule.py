from pydantic import BaseModel
from typing import List, Optional, Union
from datetime import time

class ScheduleSlotBase(BaseModel):
    # Accept string or int (0-6) as day_of_week for flexibility in clients
    day_of_week: Union[int, str]
    start_time: time
    end_time: time

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
    teacher_id: int
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    teacher_name: Optional[str] = None
    classroom_name: Optional[str] = None  # Display classroom name if assigned

    # Make day/time optional in responses to support legacy rows without explicit times
    day_of_week: Optional[Union[int, str]] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    
    class Config:
        from_attributes = True

class StudentScheduleResponse(BaseModel):
    id: int
    subject_id: int
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    teacher_name: Optional[str] = None
    # Make day/time optional for robust responses when schedules lack explicit times
    day_of_week: Optional[str] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    
    class Config:
        from_attributes = True