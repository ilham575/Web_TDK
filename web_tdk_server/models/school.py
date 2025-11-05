from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from database.connection import Base

class School(Base):
    __tablename__ = "schools"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False, unique=True)
    
    # Relationships
    schedule_slots = relationship("ScheduleSlot", back_populates="school")
