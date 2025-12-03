from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from database.connection import Base


class Grade(Base):
    __tablename__ = "grades"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=True, index=True)
    title = Column(String(255), nullable=True)  # Assignment title
    max_score = Column(Float, nullable=True, default=100.0)  # Maximum possible score
    grade = Column(Float, nullable=True)  # Actual score obtained
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Grade(subject_id={self.subject_id}, student_id={self.student_id}, title={self.title}, grade={self.grade}/{self.max_score})>"
