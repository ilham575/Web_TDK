from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AnnouncementBase(BaseModel):
    title: str
    content: str
    school_id: int  # school id the announcement belongs to
    expires_at: Optional[datetime] = None

class AnnouncementCreate(AnnouncementBase):
    pass

class AnnouncementUpdate(BaseModel):
    expires_at: Optional[datetime] = None

class Announcement(AnnouncementBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    author_id: Optional[int] = None

    class Config:
        from_attributes = True