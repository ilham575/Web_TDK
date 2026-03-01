from sqlalchemy import Column, Integer, String, DateTime
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
    
    # Relationships
    schedule_slots = relationship("ScheduleSlot", back_populates="school")
