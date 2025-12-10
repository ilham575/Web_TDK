from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.connection import Base


class Classroom(Base):
    """
    ชั้นเรียน - เก็บข้อมูลชั้นเรียนแต่ละห้อง
    เช่น ป.1/1 เทอม 1 ปีการศึกษา 2567
    """
    __tablename__ = "classrooms"
    __table_args__ = (
        UniqueConstraint('name', 'grade_level', 'school_id', 'semester', 'academic_year', name='uq_classroom_school_year'),
    )

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)  # เช่น "ป.1/1", "ป.1/2"
    grade_level = Column(String(50), nullable=False)  # เช่น "ป.1", "ม.1"
    room_number = Column(String(20), nullable=True)  # เช่น "1", "2", "A"
    semester = Column(Integer, nullable=False, default=1)  # 1 หรือ 2
    academic_year = Column(String(10), nullable=False)  # เช่น "2567"
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # เก็บ reference ว่ามาจากชั้นเรียนไหน (เมื่อเลื่อนชั้น)
    parent_classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    students = relationship("ClassroomStudent", back_populates="classroom", lazy="dynamic")
    parent_classroom = relationship("Classroom", remote_side=[id], backref="child_classrooms")

    def __repr__(self):
        return f"<Classroom(id={self.id}, name='{self.name}', grade_level='{self.grade_level}', semester={self.semester}, academic_year='{self.academic_year}')>"


class ClassroomStudent(Base):
    """
    ความสัมพันธ์ระหว่างนักเรียนและชั้นเรียน
    นักเรียนหนึ่งคนสามารถอยู่หลายชั้นเรียนได้ (ต่างเทอม/ปี)
    """
    __tablename__ = "classroom_students"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    classroom = relationship("Classroom", back_populates="students")
    student = relationship("User", backref="classroom_enrollments")

    def __repr__(self):
        return f"<ClassroomStudent(classroom_id={self.classroom_id}, student_id={self.student_id})>"
