from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from database.connection import Base

class PasswordResetRequest(Base):
    __tablename__ = "password_reset_requests"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    username = Column(String(50), nullable=False)
    full_name = Column(String(100), nullable=True)
    email = Column(String(100), nullable=True)
    role = Column(String(20), nullable=False)  # teacher, student, admin
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=True)
    status = Column(String(20), default="pending", nullable=False)  # pending, approved, rejected
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        return f"<PasswordResetRequest(username='{self.username}', role='{self.role}', status='{self.status}')>"
