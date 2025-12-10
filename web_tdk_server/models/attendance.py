from sqlalchemy import Column, Integer, Date, Text, ForeignKey, DateTime
from sqlalchemy.sql import func
from database.connection import Base


class Attendance(Base):
    __tablename__ = "attendances"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    present_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<Attendance(subject_id={self.subject_id}, date={self.date})>"
