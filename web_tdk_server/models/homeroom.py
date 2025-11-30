from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database.connection import Base

class HomeroomTeacher(Base):
    """ครูประจำชั้น - กำหนดครูที่รับผิดชอบแต่ละชั้นเรียน"""
    __tablename__ = "homeroom_teachers"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    grade_level = Column(String(50), nullable=False)  # เช่น "ป.1", "ป.2", "ม.1"
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=False, index=True)
    academic_year = Column(String(10), nullable=True)  # ปีการศึกษา เช่น "2567"
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Ensure one teacher can only be assigned to one grade level per school per academic year
    __table_args__ = (
        UniqueConstraint('teacher_id', 'school_id', 'academic_year', name='uq_homeroom_teacher_school_year'),
    )

    def __repr__(self):
        return f"<HomeroomTeacher(teacher_id={self.teacher_id}, grade_level='{self.grade_level}', school_id={self.school_id})>"
