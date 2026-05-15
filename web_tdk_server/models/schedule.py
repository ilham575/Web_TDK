from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Time, Boolean, Date, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from database.connection import Base

class ScheduleSlot(Base):
    __tablename__ = "schedule_slots"
    
    id = Column(Integer, primary_key=True, index=True)
    day_of_week = Column(String(10), nullable=False)  # monday, tuesday, etc.
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    is_break = Column(Boolean, nullable=False, default=False)
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relationships
    school = relationship("School", back_populates="schedule_slots")
    created_by_user = relationship("User", foreign_keys=[created_by])
    subject_schedules = relationship("SubjectSchedule", back_populates="schedule_slot", cascade="all, delete-orphan")

class SubjectSchedule(Base):
    __tablename__ = "subject_schedules"
    
    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    schedule_slot_id = Column(Integer, ForeignKey("schedule_slots.id"), nullable=True)  # Optional for backward compatibility
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=True)  # Specific classroom (optional - if None, applies to all)
    
    # New fields for custom time slots
    day_of_week = Column(String(10), nullable=True)  # Day of week (0-6, where 0=Sunday)
    start_time = Column(Time, nullable=True)  # Custom start time
    end_time = Column(Time, nullable=True)  # Custom end time
    
    # Track if this teacher has ended the course
    is_ended = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    subject = relationship("Subject", back_populates="subject_schedules")
    schedule_slot = relationship("ScheduleSlot", back_populates="subject_schedules")
    teacher = relationship("User", foreign_keys=[teacher_id])
    classroom = relationship("Classroom", foreign_keys=[classroom_id])
    daily_trackings = relationship("DailySubjectTracking", back_populates="subject_schedule", cascade="all, delete-orphan")


class DailySubjectTracking(Base):
    __tablename__ = "daily_subject_tracking"
    __table_args__ = (
        UniqueConstraint("subject_schedule_id", "tracking_date", name="uq_daily_subject_tracking_schedule_date"),
    )

    id = Column(Integer, primary_key=True, index=True)
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=False)
    subject_schedule_id = Column(Integer, ForeignKey("subject_schedules.id"), nullable=False)
    tracking_date = Column(Date, nullable=False)
    actual_start_time = Column(Time, nullable=True)
    actual_end_time = Column(Time, nullable=True)
    is_skipped = Column(Boolean, nullable=False, default=False)
    note = Column(String(255), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    subject_schedule = relationship("SubjectSchedule", back_populates="daily_trackings")
    school = relationship("School")
    created_by_user = relationship("User", foreign_keys=[created_by])
    updated_by_user = relationship("User", foreign_keys=[updated_by])


class BreakSchedule(Base):
    __tablename__ = "break_schedules"

    id = Column(Integer, primary_key=True, index=True)
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=False)
    academic_year = Column(String(10), nullable=False)
    semester = Column(Integer, nullable=False)
    day_of_week = Column(String(10), nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=True)
    note = Column(String(255), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    school = relationship("School")
    classroom = relationship("Classroom", foreign_keys=[classroom_id])
    created_by_user = relationship("User", foreign_keys=[created_by])
    daily_trackings = relationship("DailyBreakTracking", back_populates="break_schedule", cascade="all, delete-orphan")


class DailyBreakTracking(Base):
    __tablename__ = "daily_break_tracking"
    __table_args__ = (
        UniqueConstraint("break_schedule_id", "tracking_date", name="uq_daily_break_tracking_schedule_date"),
    )

    id = Column(Integer, primary_key=True, index=True)
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=False)
    break_schedule_id = Column(Integer, ForeignKey("break_schedules.id"), nullable=False)
    tracking_date = Column(Date, nullable=False)
    actual_start_time = Column(Time, nullable=True)
    actual_end_time = Column(Time, nullable=True)
    is_skipped = Column(Boolean, nullable=False, default=False)
    note = Column(String(255), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    break_schedule = relationship("BreakSchedule", back_populates="daily_trackings")
    school = relationship("School")
    created_by_user = relationship("User", foreign_keys=[created_by])
    updated_by_user = relationship("User", foreign_keys=[updated_by])


class SchoolHoliday(Base):
    __tablename__ = "school_holidays"
    __table_args__ = (
        UniqueConstraint("school_id", "holiday_date", name="uq_school_holiday_date"),
    )

    id = Column(Integer, primary_key=True, index=True)
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=False)
    holiday_date = Column(Date, nullable=False)
    note = Column(String(255), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    school = relationship("School")
    created_by_user = relationship("User", foreign_keys=[created_by])