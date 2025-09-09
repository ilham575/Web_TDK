from pydantic import BaseModel

class Announcement(BaseModel):
    title: str
    content: str

class AnnouncementUpdate(BaseModel):
    title: str = None
    content: str = None