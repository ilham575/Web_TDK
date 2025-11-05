from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Time
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from database.connection import Base

class ScheduleSlot(Base):
    __tablename__ = "schedule_slots"
    
    id = Column(Integer, primary_key=True, index=True)
    day_of_week = Column(String(10), nullable=False)  # monday, tuesday, etc.
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
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
    
    # New fields for custom time slots
    day_of_week = Column(String(10), nullable=True)  # Day of week (0-6, where 0=Sunday)
    start_time = Column(Time, nullable=True)  # Custom start time
    end_time = Column(Time, nullable=True)  # Custom end time
    
    # Relationships
    subject = relationship("Subject", back_populates="subject_schedules")
    schedule_slot = relationship("ScheduleSlot", back_populates="subject_schedules")
    teacher = relationship("User", foreign_keys=[teacher_id])