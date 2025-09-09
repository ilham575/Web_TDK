from fastapi import APIRouter, HTTPException, Depends, Query
from schema.announcement import Announcement, AnnouncementUpdate
from database import (create_announcement_table, add_announcement,
                      get_announcements as db_get_announcements,
                      get_all_announcements, update_announcement, delete_announcement)
from security import get_current_user
from pydantic import BaseModel

router = APIRouter()

# สร้างตารางประกาศข่าวถ้ายังไม่มี
create_announcement_table()

@router.post("/announcement")
def create_announcement(announcement: Announcement, school_id: str = Query(...), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Only admin and teacher can create announcements")
    add_announcement(announcement.title, announcement.content, school_id)
    return {"message": "Announcement created successfully"}

@router.get("/announcement")
def get_announcements(school_id: str = Query(...)):
    return db_get_announcements(school_id)

@router.get("/announcement/all")
def get_all():
    return get_all_announcements()

@router.patch("/announcement/{announcement_id}")
def edit_announcement(announcement_id: int, update: AnnouncementUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Only admin and teacher can edit announcements")
    success = update_announcement(announcement_id, update.title, update.content)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to update announcement")
    return {"message": "Announcement updated successfully"}

@router.delete("/announcement/{announcement_id}")
def remove_announcement(announcement_id: int, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Only admin and teacher can delete announcements")
    success = delete_announcement(announcement_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to delete announcement")
    return {"message": "Announcement deleted successfully"}
