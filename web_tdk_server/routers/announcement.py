from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from typing import List, Optional
from schemas.announcement import Announcement, AnnouncementCreate, AnnouncementUpdate
from models.announcement import Announcement as AnnouncementModel
from database.connection import get_db
from routers.user import get_current_user  # keep existing
from models.user import User as UserModel
from fastapi.security import OAuth2PasswordBearer
from utils.security import decode_access_token
from sqlalchemy import or_
from datetime import datetime

router = APIRouter(prefix="/announcements", tags=["announcements"])

# optional oauth2 scheme (no auto_error) for endpoints that accept anonymous access
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/users/login", auto_error=False)

def get_optional_current_user(token: str = Depends(oauth2_scheme_optional), db: Session = Depends(get_db)) -> Optional[UserModel]:
    if not token:
        return None
    try:
        payload = decode_access_token(token)
        username = payload.get("sub")
        if not username:
            return None
        user = db.query(UserModel).filter(UserModel.username == username).first()
        return user
    except Exception:
        return None

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
    # set expiry if provided
    if getattr(announcement, 'expires_at', None):
        new_announcement.expires_at = announcement.expires_at
    db.add(new_announcement)
    db.commit()
    db.refresh(new_announcement)
    return new_announcement

@router.get("/", response_model=List[Announcement])
def list_announcements(db: Session = Depends(get_db), school_id: int = None, current_user: Optional[UserModel] = Depends(get_optional_current_user)):
    query = db.query(AnnouncementModel)
    if school_id is not None:
        query = query.filter(AnnouncementModel.school_id == school_id)

    # if requester is admin, return all announcements
    if current_user and getattr(current_user, 'role', None) == 'admin':
        return query.order_by(AnnouncementModel.created_at.desc()).all()

    # For non-admins / anonymous users, only return announcements that are not expired,
    # or those owned by the current_user (so owners can still see their expired posts).
    now = datetime.now()
    if current_user:
        query = query.filter(or_(AnnouncementModel.expires_at == None, AnnouncementModel.expires_at > now, AnnouncementModel.author_id == current_user.id))
    else:
        query = query.filter(or_(AnnouncementModel.expires_at == None, AnnouncementModel.expires_at > now))

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


@router.patch("/{announcement_id}", response_model=Announcement)
def update_announcement(
    announcement_id: int,
    announcement_update: AnnouncementUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    announcement = db.query(AnnouncementModel).filter(AnnouncementModel.id == announcement_id).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")
    # only owner or admin can update expiry
    if (announcement.author_id != current_user.id) and (getattr(current_user, "role", None) != "admin"):
        raise HTTPException(status_code=403, detail="Not authorized to update this announcement")
    if announcement_update.expires_at is not None:
        announcement.expires_at = announcement_update.expires_at
    db.commit()
    db.refresh(announcement)
    return announcement