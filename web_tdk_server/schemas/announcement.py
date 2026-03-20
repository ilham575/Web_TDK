from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AnnouncementBase(BaseModel):
    title: str
    content: str
    school_id: int  # school id the announcement belongs to
    expires_at: Optional[datetime] = None
    to_students: Optional[bool] = True
    to_teachers: Optional[bool] = True

class AnnouncementCreate(AnnouncementBase):
    pass

class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    expires_at: Optional[datetime] = None
    to_students: Optional[bool] = None
    to_teachers: Optional[bool] = None

class Announcement(AnnouncementBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    author_id: Optional[int] = None
    author_name: Optional[str] = None
    to_students: Optional[bool] = True
    to_teachers: Optional[bool] = True
    pdf_file_path: Optional[str] = None
    pdf_file_name: Optional[str] = None

    class Config:
        from_attributes = True