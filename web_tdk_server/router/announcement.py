from fastapi import APIRouter, HTTPException, Depends
from schema.announcement import Announcement
from database import create_announcement_table, add_announcement, get_announcements as db_get_announcements
from security import get_current_user

router = APIRouter()

# สร้างตารางประกาศข่าวถ้ายังไม่มี
create_announcement_table()

@router.post("/announcement")
def create_announcement(announcement: Announcement, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Only admin and teacher can create announcements")
    add_announcement(announcement.title, announcement.content)
    return {"message": "Announcement created successfully"}

@router.get("/announcement")
def get_announcements():
    return db_get_announcements()
