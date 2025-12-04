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
    absence_date = Column(Date, nullable=False, index=True)  # Start date
    absence_date_end = Column(Date, nullable=True, index=True)  # End date (for multi-day absence)
    days_count = Column(Integer, default=1, nullable=False)  # Number of days for absence (for multi-day absence)
    absence_type = Column(Enum(AbsenceType), default=AbsenceType.PERSONAL, nullable=False)
    reason = Column(Text, nullable=True)
    status = Column(Enum(AbsenceStatus), default=AbsenceStatus.PENDING, nullable=False)
    
    # Approval tracking fields
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)  # ผู้อนุมัติ/ปฏิเสธ
    approved_at = Column(DateTime(timezone=True), nullable=True)  # เวลาที่อนุมัติ/ปฏิเสธ
    approver_role = Column(String(20), nullable=True)  # 'admin' หรือ 'teacher' (homeroom)
    reject_reason = Column(Text, nullable=True)  # เหตุผลการปฏิเสธ
    
    # Optimistic locking version for race condition prevention
    version = Column(Integer, default=1, nullable=False)
    # Optional link to an announcement created for this absence (for notifications)
    announcement_id = Column(Integer, ForeignKey("announcements.id"), nullable=True, index=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Absence(student_id={self.student_id}, absence_date={self.absence_date}, type={self.absence_type})>"
