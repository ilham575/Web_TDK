from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from database.connection import Base

class School(Base):
    __tablename__ = "schools"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False, unique=True)
    logo_url = Column(String(500), nullable=True)  # URL หรือ path ของโลโก้
    grade_announcement_date = Column(DateTime(timezone=True), nullable=True)  # วันประกาศผลคะแนน
    
    # Relationships
    schedule_slots = relationship("ScheduleSlot", back_populates="school")
