from pydantic import BaseModel
from typing import List, Optional


class GradeEntry(BaseModel):
    student_id: int
    grade: Optional[float] = None


class GradesBulk(BaseModel):
    subject_id: int
    title: str  # Assignment title
    max_score: float = 100.0  # Maximum possible score
    grades: List[GradeEntry]
    classroom_id: Optional[int] = None


class GradeResponse(BaseModel):
    id: int
    subject_id: int
    student_id: int
    classroom_id: Optional[int] = None
    title: Optional[str] = None
    max_score: Optional[float] = None
    grade: Optional[float] = None
    student_number: Optional[int] = None

    class Config:
        from_attributes = True


class AssignmentCreate(BaseModel):
    title: str
    max_score: float = 100.0
    classroom_id: Optional[int] = None


class AssignmentUpdate(BaseModel):
    title: Optional[str] = None
    max_score: Optional[float] = None
    classroom_id: Optional[int] = None


class AssignmentResponse(BaseModel):
    id: int
    title: str
    max_score: float
    classroom_id: Optional[int] = None

    class Config:
        from_attributes = True


class MissingSummaryStudent(BaseModel):
    student_id: int
    student_number: Optional[int] = None
    full_name: str
    username: Optional[str] = None
    classroom_name: Optional[str] = None
    missing_titles: List[str]


class SummaryCompletionReportItem(BaseModel):
    subject_id: int
    subject_name: str
    subject_type: str
    academic_year: Optional[str] = None
    semester: Optional[int] = None
    classroom_id: Optional[int] = None
    classroom_name: Optional[str] = None
    teacher_names: List[str]
    required_summary_titles: List[str]
    student_count: int
    completed_students_count: int
    missing_students_count: int
    completion_percentage: float
    is_complete: bool
    missing_students: List[MissingSummaryStudent]
