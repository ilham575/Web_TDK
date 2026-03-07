from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class CharacteristicTopicBase(BaseModel):
    name: str

class CharacteristicTopicCreate(CharacteristicTopicBase):
    pass

class CharacteristicTopicResponse(CharacteristicTopicBase):
    id: int
    is_active: int

    class Config:
        from_attributes = True

class CharacteristicScoreBase(BaseModel):
    topic_id: int
    rating: str

class CharacteristicScoreCreate(CharacteristicScoreBase):
    pass

class CharacteristicScoreResponse(CharacteristicScoreBase):
    id: int
    topic_name: Optional[str] = None

    class Config:
        from_attributes = True

class EvaluationBase(BaseModel):
    student_id: int
    subject_id: int
    teacher_id: int
    reading: str
    writing: str
    analysis: str
    academic_year: Optional[str] = None
    semester: Optional[int] = None

class EvaluationCreate(EvaluationBase):
    characteristic_scores: List[CharacteristicScoreCreate] = []

class EvaluationUpdate(BaseModel):
    reading: Optional[str] = None
    writing: Optional[str] = None
    analysis: Optional[str] = None
    characteristic_scores: Optional[List[CharacteristicScoreCreate]] = None

class EvaluationResponse(EvaluationBase):
    id: int
    created_at: datetime
    subject_name: Optional[str] = None
    student_name: Optional[str] = None
    classroom_name: Optional[str] = None
    classroom_id: Optional[int] = None
    characteristic_scores: List[CharacteristicScoreResponse] = []

    class Config:
        from_attributes = True

class CharacteristicScoreSummary(BaseModel):
    topic_name: str
    average_score: float
    count: int

class SubjectEvaluationSummary(BaseModel):
    subject_id: int
    subject_name: str
    total_evaluations: int
    total_students_evaluated: int
    average_reading_score: float
    average_writing_score: float
    average_analysis_score: float
    characteristic_scores_summary: List[CharacteristicScoreSummary]

class EvaluationSummaryResponse(BaseModel):
    total_evaluations: int
    total_students_evaluated: int
    average_reading_score: float
    average_writing_score: float
    average_analysis_score: float
    characteristic_scores_summary: List[CharacteristicScoreSummary]
    subject_summaries: List[SubjectEvaluationSummary]

    class Config:
        from_attributes = True