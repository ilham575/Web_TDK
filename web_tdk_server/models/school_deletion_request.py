from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from database.connection import Base

class SchoolDeletionRequest(Base):
    __tablename__ = "school_deletion_requests"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=False, index=True)
    requested_by = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)  # admin user who requested
    reason = Column(Text, nullable=True)  # reason for deletion
    status = Column(String(20), default="pending", nullable=False)  # pending, approved, rejected
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)  # owner who reviewed
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    review_notes = Column(Text, nullable=True)  # notes from owner
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<SchoolDeletionRequest(school_id={self.school_id}, requested_by={self.requested_by}, status='{self.status}')>"