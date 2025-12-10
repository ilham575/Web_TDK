from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.sql import func
from database.connection import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default="student", nullable=False)  # student, teacher, admin, owner
    is_active = Column(Boolean, default=True, nullable=False)
    must_change_password = Column('force_password_change', Boolean, default=False, nullable=False)
    grade_level = Column(String(50), nullable=True)  # e.g., "ชั้นประถมศึกษาปีที่ 1", "ป.1", etc.
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=True, index=True)
    
    def __repr__(self):
        return f"<User(username='{self.username}', email='{self.email}', role='{self.role}', grade_level='{self.grade_level}')>"
