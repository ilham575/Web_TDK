from sqlalchemy import Column, Integer, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database.connection import Base


class ClassroomSubject(Base):
    """
    ความสัมพันธ์ระหว่างชั้นเรียนและรายวิชา
    1 ชั้นเรียนสามารถมีรายวิชาได้หลายรายวิชา
    1 รายวิชาสามารถมีชั้นเรียนได้หลายชั้น
    """
    __tablename__ = "classroom_subjects"
    __table_args__ = (
        UniqueConstraint('classroom_id', 'subject_id', name='uq_classroom_subject'),
    )

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False, index=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    classroom = relationship("Classroom", backref="classroom_subjects")
    subject = relationship("Subject", back_populates="classrooms")

    def __repr__(self):
        return f"<ClassroomSubject(classroom_id={self.classroom_id}, subject_id={self.subject_id})>"
