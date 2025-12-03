from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database.connection import Base

class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(150), nullable=False)
    code = Column(String(50), nullable=True)  # Add subject code
    subject_type = Column(String(50), nullable=False, default='main')  # 'main' or 'activity'
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=True, index=True)
    credits = Column(Integer, nullable=True)
    activity_percentage = Column(Integer, nullable=True)
    is_ended = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    subject_schedules = relationship("SubjectSchedule", back_populates="subject")
    classrooms = relationship("ClassroomSubject", back_populates="subject")

    def __repr__(self):
        return f"<Subject(name='{self.name}', subject_type='{self.subject_type}', teacher_id={self.teacher_id}, is_ended={self.is_ended})>"
