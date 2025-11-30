from sqlalchemy import Column, Integer, String, Date, Text, ForeignKey, DateTime, Enum
from sqlalchemy.sql import func
from database.connection import Base
import enum


class AbsenceType(str, enum.Enum):
    SICK = "sick"
    PERSONAL = "personal"
    OTHER = "other"


class AbsenceStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class Absence(Base):
    __tablename__ = "absences"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True, index=True)
    absence_date = Column(Date, nullable=False, index=True)
    absence_type = Column(Enum(AbsenceType), default=AbsenceType.PERSONAL, nullable=False)
    reason = Column(Text, nullable=True)
    status = Column(Enum(AbsenceStatus), default=AbsenceStatus.PENDING, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Absence(student_id={self.student_id}, absence_date={self.absence_date}, type={self.absence_type})>"
