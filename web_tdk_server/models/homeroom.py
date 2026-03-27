from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database.connection import Base

class HomeroomTeacher(Base):
    """ครูประจำชั้น - กำหนดครูที่รับผิดชอบแต่ละชั้นเรียน"""
    __tablename__ = "homeroom_teachers"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    grade_level = Column(String(50), nullable=True)  # เช่น "ป.1", "ป.2", "ม.1" (optional when classroom_id is used)
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=True, index=True)
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=False, index=True)
    academic_year = Column(String(10), nullable=True)  # ปีการศึกษา เช่น "2567"
    semester = Column(Integer, nullable=True, index=True)  # ภาคเรียน เช่น 1 หรือ 2
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Ensure one teacher can only be assigned to one homeroom per school per academic year
    # Also ensure a classroom can have at most one homeroom assignment per academic year
    __table_args__ = (
        UniqueConstraint('teacher_id', 'school_id', 'academic_year', 'semester', name='uq_homeroom_teacher_school_year_semester'),
        UniqueConstraint('classroom_id', 'academic_year', 'semester', name='uq_homeroom_classroom_year_semester'),
    )

    # Relationships
    classroom = relationship("Classroom", foreign_keys=[classroom_id])

    def __repr__(self):
        return f"<HomeroomTeacher(teacher_id={self.teacher_id}, grade_level='{self.grade_level}', classroom_id={self.classroom_id}, school_id={self.school_id})>"
