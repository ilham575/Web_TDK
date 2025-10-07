from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AnnouncementBase(BaseModel):
    title: str
    content: str
    school_id: int  # เพิ่มบรรทัดนี้

class AnnouncementCreate(AnnouncementBase):
    pass

class Announcement(AnnouncementBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True