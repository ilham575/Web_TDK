from pydantic import BaseModel
from typing import List


class GradeEntry(BaseModel):
    student_id: int
    grade: float


class GradesBulk(BaseModel):
    subject_id: int
    grades: List[GradeEntry]


class GradeResponse(BaseModel):
    id: int
    subject_id: int
    student_id: int
    grade: float

    class Config:
        from_attributes = True
