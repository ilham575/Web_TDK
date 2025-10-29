from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from typing import List
from schemas.announcement import Announcement, AnnouncementCreate
from models.announcement import Announcement as AnnouncementModel
from database.connection import get_db
from routers.user import get_current_user  # เพิ่มบรรทัดนี้

router = APIRouter(prefix="/announcements", tags=["announcements"])

@router.post("/", response_model=Announcement, status_code=status.HTTP_201_CREATED)
def create_announcement(
    announcement: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)  # เพิ่มตรงนี้
):
    new_announcement = AnnouncementModel(
        title=announcement.title,
        content=announcement.content,
        author_id=current_user.id,  # ดึง id จาก user ที่ login
        school_id=announcement.school_id,  # เพิ่มบรรทัดนี้
        is_published=True
    )
    db.add(new_announcement)
    db.commit()
    db.refresh(new_announcement)
    return new_announcement

@router.get("/", response_model=List[Announcement])
def list_announcements(db: Session = Depends(get_db), school_id: int = None):
    query = db.query(AnnouncementModel)
    if school_id is not None:
        query = query.filter(AnnouncementModel.school_id == school_id)
    return query.order_by(AnnouncementModel.created_at.desc()).all()

@router.get("/{announcement_id}", response_model=Announcement)
def get_announcement(announcement_id: int, db: Session = Depends(get_db)):
    announcement = db.query(AnnouncementModel).filter(AnnouncementModel.id == announcement_id).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")
    return announcement

@router.delete("/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_announcement(
    announcement_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    announcement = db.query(AnnouncementModel).filter(AnnouncementModel.id == announcement_id).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")
    # เฉพาะเจ้าของหรือ admin เท่านั้นที่ลบได้
    if (announcement.author_id != current_user.id) and (getattr(current_user, "role", None) != "admin"):
        raise HTTPException(status_code=403, detail="Not authorized to delete this announcement")
    db.delete(announcement)
    db.commit()
    return