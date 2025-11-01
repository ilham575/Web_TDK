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


class GradeResponse(BaseModel):
    id: int
    subject_id: int
    student_id: int
    title: Optional[str] = None
    max_score: Optional[float] = None
    grade: Optional[float] = None

    class Config:
        from_attributes = True


class AssignmentCreate(BaseModel):
    title: str
    max_score: float = 100.0


class AssignmentUpdate(BaseModel):
    title: Optional[str] = None
    max_score: Optional[float] = None


class AssignmentResponse(BaseModel):
    id: int
    title: str
    max_score: float

    class Config:
        from_attributes = True
