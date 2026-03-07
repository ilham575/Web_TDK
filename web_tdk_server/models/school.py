from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.orm import relationship
from database.connection import Base

class School(Base):
    __tablename__ = "schools"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False, unique=True)
    logo_url = Column(String(500), nullable=True)  # URL หรือ path ของโลโก้
    grade_announcement_date = Column(DateTime(timezone=True), nullable=True)  # วันประกาศผลคะแนน
    can_teacher_view_summary = Column(Integer, default=0) # 0 = NO, 1 = YES
    is_grade_announced = Column(Integer, default=0) # 0 = NO, 1 = YES

    # Granular Access Control
    is_view_grades_by_year_semester = Column(Boolean, default=False, nullable=False, server_default='0') # True = Only current year/semester, False = All
    
    # Academic year setup enforcement
    is_academic_year_setup = Column(Boolean, default=False, nullable=False, server_default='0')  # ตั้งค่าปีการศึกษาแล้วหรือยัง
    current_academic_year = Column(String(10), nullable=True)  # ปีการศึกษาปัจจุบัน เช่น "2569"
    current_semester = Column(Integer, nullable=True)  # ภาคเรียนปัจจุบัน เช่น 1 หรือ 2
    
    # Relationships
    schedule_slots = relationship("ScheduleSlot", back_populates="school")
