from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func
from database.connection import Base

class AdminRequest(Base):
    __tablename__ = "admin_requests"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=True)
    full_name = Column(String(100), nullable=False)
    password_hash = Column(String(255), nullable=False)
    school_name = Column(String(255), nullable=False)
    status = Column(String(20), default="pending", nullable=False)  # pending, approved, rejected
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        return f"<AdminRequest(username='{self.username}', email='{self.email}', school_name='{self.school_name}', status='{self.status}')>"