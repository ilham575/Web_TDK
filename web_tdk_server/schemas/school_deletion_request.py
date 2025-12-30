from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class SchoolDeletionRequestBase(BaseModel):
    school_id: int
    reason: Optional[str] = None

class SchoolDeletionRequestCreate(SchoolDeletionRequestBase):
    pass

class SchoolDeletionRequest(SchoolDeletionRequestBase):
    id: int
    requested_by: int
    status: str
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    review_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True