from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, UniqueConstraint
from sqlalchemy.sql import func
from database.connection import Base


class SemesterPeriod(Base):
    __tablename__ = "semester_periods"
    __table_args__ = (
        UniqueConstraint('school_id', 'academic_year', 'semester', name='uq_semester_period'),
    )

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=False, index=True)
    academic_year = Column(String(10), nullable=False)
    semester = Column(Integer, nullable=False)
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    is_auto_closed = Column(Boolean, default=False)  # True if subjects were auto-closed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<SemesterPeriod(school_id={self.school_id}, year={self.academic_year}, semester={self.semester})>"
