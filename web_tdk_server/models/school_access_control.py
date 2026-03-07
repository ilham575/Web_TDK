from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from database.connection import Base

class SchoolAccessControl(Base):
    """
    Granular access control per school, academic year, and semester
    Controls whether teachers can view summary and whether students can view grades
    """
    __tablename__ = "school_access_control"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=False, index=True)
    academic_year = Column(String(10), nullable=False)  # e.g., "2569"
    semester = Column(Integer, nullable=False)  # 1 or 2
    
    # Access flags for this year/semester combination
    allow_teacher_view_summary = Column(Boolean, default=False, nullable=False)  # Can homeroom teachers see student summary/ranking?
    allow_student_view_grades = Column(Boolean, default=False, nullable=False)  # Can students see grade transcript?
    
    # Unique constraint: one record per school + year + semester
    __table_args__ = (
        UniqueConstraint('school_id', 'academic_year', 'semester', name='unique_school_year_semester'),
    )
    
    # Relationship back to School
    school = relationship("School", backref="access_controls")
