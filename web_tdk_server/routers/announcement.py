from pathlib import Path

from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from schemas.announcement import Announcement, AnnouncementCreate, AnnouncementUpdate
from models.announcement import Announcement as AnnouncementModel
from models.absence import Absence as AbsenceModel
from database.connection import get_db
from routers.user import get_current_user  # keep existing
from models.user import User as UserModel
from sqlalchemy import or_, and_
from datetime import datetime
import os
import shutil
import uuid
from utils.security import get_optional_current_user

router = APIRouter(prefix="/announcements", tags=["announcements"])

PDF_UPLOAD_DIR = "uploads/pdfs"
os.makedirs(PDF_UPLOAD_DIR, exist_ok=True)


def _resolve_managed_pdf_path(file_path: str) -> Path | None:
    if not file_path:
        return None

    upload_root = Path(PDF_UPLOAD_DIR).resolve()
    candidate = Path(file_path.lstrip("/")).resolve()
    if upload_root == candidate or upload_root in candidate.parents:
        return candidate
    return None


def _sanitize_pdf_filename(filename: str) -> str:
    original_name = Path(filename).name
    sanitized = "".join(ch for ch in original_name if ch.isalnum() or ch in {"-", "_", "."})
    if not sanitized.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Invalid PDF filename")
    return sanitized

@router.post("", response_model=Announcement, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=Announcement, status_code=status.HTTP_201_CREATED)
def create_announcement(
    announcement: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)  # เพิ่มตรงนี้
):
    # Prevent students from creating announcements
    role = getattr(current_user, 'role', None)
    if role == 'student':
        raise HTTPException(status_code=403, detail='Students are not allowed to create announcements')

    # Teachers may only create announcements targeted to students
    to_students = getattr(announcement, 'to_students', True)
    to_teachers = getattr(announcement, 'to_teachers', False) if role == 'teacher' else getattr(announcement, 'to_teachers', True)

    if not to_students and not to_teachers:
        raise HTTPException(status_code=400, detail='Please select at least one target audience')

    new_announcement = AnnouncementModel(
        title=announcement.title,
        content=announcement.content,
        author_id=current_user.id,
        school_id=announcement.school_id,
        is_published=True,
        to_students=bool(to_students),
        to_teachers=bool(to_teachers)
    )

    if getattr(announcement, 'expires_at', None):
        new_announcement.expires_at = announcement.expires_at

    db.add(new_announcement)
    db.commit()
    db.refresh(new_announcement)
    # Prepare response dict including author name
    return {
        'id': new_announcement.id,
        'title': new_announcement.title,
        'content': new_announcement.content,
        'school_id': new_announcement.school_id,
        'expires_at': new_announcement.expires_at,
        'created_at': new_announcement.created_at,
        'updated_at': new_announcement.updated_at,
        'author_id': new_announcement.author_id,
        'author_name': getattr(current_user, 'full_name', None) or getattr(current_user, 'username', None),
        'to_students': new_announcement.to_students,
        'to_teachers': new_announcement.to_teachers,
        'pdf_file_path': new_announcement.pdf_file_path,
        'pdf_file_name': new_announcement.pdf_file_name,
        'is_published': new_announcement.is_published
    }

@router.get("", response_model=List[Announcement])
@router.get("/", response_model=List[Announcement])
def list_announcements(db: Session = Depends(get_db), school_id: int = None, current_user: Optional[UserModel] = Depends(get_optional_current_user)):
    query = db.query(AnnouncementModel)
    if school_id is not None:
        query = query.filter(AnnouncementModel.school_id == school_id)

    # if requester is admin, return all announcements
    if current_user and getattr(current_user, 'role', None) == 'admin':
        rows = query.order_by(AnnouncementModel.created_at.desc()).all()
        result = []
        for a in rows:
            result.append({
                'id': a.id,
                'title': a.title,
                'content': a.content,
                'school_id': a.school_id,
                'expires_at': a.expires_at,
                'created_at': a.created_at,
                'updated_at': a.updated_at,
                'author_id': a.author_id,
                'author_name': getattr(a.author, 'full_name', None) if hasattr(a, 'author') else None,
                'to_students': a.to_students,
                'to_teachers': a.to_teachers,
                'pdf_file_path': a.pdf_file_path,
                'pdf_file_name': a.pdf_file_name,
                'is_published': a.is_published
            })
        return result

    # For non-admins / anonymous users, only return announcements targeted to their role
    now = datetime.now()
    if current_user:
        role = getattr(current_user, 'role', None)
        # expiry filter: not expired or authored by current user
        expiry_filter = or_(AnnouncementModel.expires_at == None, AnnouncementModel.expires_at > now, AnnouncementModel.author_id == current_user.id)

        if role == 'teacher':
            audience_filter = or_(AnnouncementModel.to_teachers == True, AnnouncementModel.author_id == current_user.id)
        elif role == 'student':
            audience_filter = or_(AnnouncementModel.to_students == True, AnnouncementModel.author_id == current_user.id)
        else:
            audience_filter = or_(AnnouncementModel.to_students == True, AnnouncementModel.to_teachers == True, AnnouncementModel.author_id == current_user.id)

        query = query.filter(and_(expiry_filter, audience_filter))
    else:
        # anonymous: only non-expired announcements targeted to students
        query = query.filter(and_(or_(AnnouncementModel.expires_at == None, AnnouncementModel.expires_at > now), AnnouncementModel.to_students == True))

    rows = query.order_by(AnnouncementModel.created_at.desc()).all()
    result = []
    for a in rows:
        result.append({
            'id': a.id,
            'title': a.title,
            'content': a.content,
            'school_id': a.school_id,
            'expires_at': a.expires_at,
            'created_at': a.created_at,
            'updated_at': a.updated_at,
            'author_id': a.author_id,
            'author_name': getattr(a.author, 'full_name', None) if hasattr(a, 'author') else None,
            'to_students': a.to_students,
            'to_teachers': a.to_teachers,
            'pdf_file_path': a.pdf_file_path,
            'pdf_file_name': a.pdf_file_name,
            'is_published': a.is_published
        })
    return result

@router.get("/{announcement_id}", response_model=Announcement)
def get_announcement(announcement_id: int, db: Session = Depends(get_db)):
    announcement = db.query(AnnouncementModel).filter(AnnouncementModel.id == announcement_id).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")
    # enrich with author_name
    return {
        'id': announcement.id,
        'title': announcement.title,
        'content': announcement.content,
        'school_id': announcement.school_id,
        'expires_at': announcement.expires_at,
        'created_at': announcement.created_at,
        'updated_at': announcement.updated_at,
        'author_id': announcement.author_id,
        'author_name': getattr(announcement.author, 'full_name', None) if hasattr(announcement, 'author') else None,
        'to_students': announcement.to_students,
        'to_teachers': announcement.to_teachers,
        'pdf_file_path': announcement.pdf_file_path,
        'pdf_file_name': announcement.pdf_file_name,
        'is_published': announcement.is_published
    }

@router.delete("/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_announcement(
    announcement_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    announcement = db.query(AnnouncementModel).filter(AnnouncementModel.id == announcement_id).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")
    role = getattr(current_user, "role", None)
    # เจ้าของหรือ admin ลบได้เสมอ
    is_authorized = (announcement.author_id == current_user.id) or (role == "admin")
    # ครูสามารถลบข่าวที่สร้างจากการลาเรียน (linked absence) ในโรงเรียนเดียวกันได้
    if not is_authorized and role == "teacher":
        teacher_school_id = getattr(current_user, "school_id", None)
        if teacher_school_id and announcement.school_id == teacher_school_id:
            linked_absence = db.query(AbsenceModel).filter(
                AbsenceModel.announcement_id == announcement_id
            ).first()
            if linked_absence:
                is_authorized = True
    if not is_authorized:
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
    # only owner or admin can update announcement
    if (announcement.author_id != current_user.id) and (getattr(current_user, "role", None) != "admin"):
        raise HTTPException(status_code=403, detail="Not authorized to update this announcement")
    update_data = announcement_update.dict(exclude_unset=True)

    if 'title' in update_data:
        announcement.title = update_data['title']
    if 'content' in update_data:
        announcement.content = update_data['content']
    if 'expires_at' in update_data:
        announcement.expires_at = update_data['expires_at']

    role = getattr(current_user, 'role', None)
    if role == 'teacher':
        announcement.to_students = True
        announcement.to_teachers = False
    else:
        if 'to_students' in update_data:
            announcement.to_students = bool(update_data['to_students'])
        if 'to_teachers' in update_data:
            announcement.to_teachers = bool(update_data['to_teachers'])

    if not announcement.to_students and not announcement.to_teachers:
        raise HTTPException(status_code=400, detail='Please select at least one target audience')

    db.commit()
    db.refresh(announcement)
    return announcement


@router.post("/{announcement_id}/upload-pdf", response_model=Announcement)
def upload_announcement_pdf(
    announcement_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    announcement = db.query(AnnouncementModel).filter(AnnouncementModel.id == announcement_id).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")
    if (announcement.author_id != current_user.id) and (getattr(current_user, "role", None) not in ("admin", "owner")):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Validate file type
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    # Delete old PDF if exists
    if announcement.pdf_file_path:
        old_path = _resolve_managed_pdf_path(announcement.pdf_file_path)
        if old_path and old_path.exists():
            try:
                old_path.unlink()
            except Exception:
                pass

    # Save new PDF
    safe_name = f"{uuid.uuid4().hex}_{_sanitize_pdf_filename(file.filename)}"
    dest = os.path.join(PDF_UPLOAD_DIR, safe_name)
    with open(dest, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    announcement.pdf_file_path = f"/uploads/pdfs/{safe_name}"
    announcement.pdf_file_name = file.filename
    db.commit()
    db.refresh(announcement)
    return announcement


@router.delete("/{announcement_id}/pdf", status_code=status.HTTP_204_NO_CONTENT)
def delete_announcement_pdf(
    announcement_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    announcement = db.query(AnnouncementModel).filter(AnnouncementModel.id == announcement_id).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")
    if (announcement.author_id != current_user.id) and (getattr(current_user, "role", None) not in ("admin", "owner")):
        raise HTTPException(status_code=403, detail="Not authorized")

    if announcement.pdf_file_path:
        old_path = _resolve_managed_pdf_path(announcement.pdf_file_path)
        if old_path and old_path.exists():
            try:
                old_path.unlink()
            except Exception:
                pass
        announcement.pdf_file_path = None
        announcement.pdf_file_name = None
        db.commit()
    return