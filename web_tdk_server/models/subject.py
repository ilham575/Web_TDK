from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from database.connection import Base

class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(150), nullable=False)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=True, index=True)
    is_ended = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Subject(name='{self.name}', teacher_id={self.teacher_id}, is_ended={self.is_ended})>"
