from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File
from sqlalchemy.orm import Session
from schemas.school import SchoolCreate, School, SchoolUpdate
from models.school import School as SchoolModel
from database.connection import get_db
from routers.user import get_current_user
import os
import shutil
from datetime import datetime

router = APIRouter(prefix="/schools", tags=["schools"])

# โฟลเดอร์สำหรับจัดเก็บไฟล์อัพโหลด
UPLOAD_DIR = "uploads/logos"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _safe_delete_logo_file(logo_url: str):
    """Safely delete a logo file if it's stored in our UPLOAD_DIR.

    We verify the logo_url points under the uploads/logos path to avoid deleting arbitrary files.
    """
    try:
        if not logo_url or not isinstance(logo_url, str):
            print(f"Skipping delete: logo_url is empty or not a string")
            return
        print(f"Attempting to delete logo: {logo_url}")
        # our stored logo_url is like "/uploads/logos/filename.ext"
        if not logo_url.startswith('/uploads/logos/'):
            print(f"Skipping delete: logo_url does not start with /uploads/logos/: {logo_url}")
            return
        filename = os.path.basename(logo_url)
        print(f"Extracted filename: {filename}")
        abs_upload_dir = os.path.abspath(UPLOAD_DIR)
        candidate = os.path.abspath(os.path.join(UPLOAD_DIR, filename))
        print(f"Candidate path: {candidate}, upload_dir: {abs_upload_dir}")
        # ensure candidate is inside upload_dir
        if not candidate.startswith(abs_upload_dir + os.path.sep) and candidate != abs_upload_dir:
            print(f"Refusing to delete file outside upload dir: {candidate}")
            return
        if os.path.exists(candidate):
            os.remove(candidate)
            print(f"✓ Deleted old logo file: {candidate}")
        else:
            print(f"⚠ File does not exist: {candidate}")
    except Exception as e:
        # don't raise; log and continue
        print(f"✗ Failed to delete old logo file '{logo_url}': {e}")

@router.post("", response_model=School, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=School, status_code=status.HTTP_201_CREATED)
def create_school(school: SchoolCreate, db: Session = Depends(get_db)):
    db_school = db.query(SchoolModel).filter(SchoolModel.name == school.name).first()
    if db_school:
        raise HTTPException(status_code=400, detail="School already exists")
    new_school = SchoolModel(name=school.name, logo_url=school.logo_url)
    db.add(new_school)
    db.commit()
    db.refresh(new_school)
    return new_school

@router.get("", response_model=list[School])
@router.get("/", response_model=list[School])
def list_schools(db: Session = Depends(get_db)):
    return db.query(SchoolModel).all()

@router.get("/{school_id}", response_model=School)
def get_school(school_id: int, db: Session = Depends(get_db)):
    school = db.query(SchoolModel).filter(SchoolModel.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    return school

@router.patch("/{school_id}", response_model=School)
def update_school(school_id: int, school_update: SchoolUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    # เฉพาะ admin เท่านั้นที่สามารถแก้ไข
    if getattr(current_user, 'role', None) != 'admin':
        raise HTTPException(status_code=403, detail="Only admin can update schools")
    
    school = db.query(SchoolModel).filter(SchoolModel.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    # Update name if provided
    if school_update.name:
        school.name = school_update.name
    
    # Update grade_announcement_date if provided
    update_data = school_update.dict(exclude_unset=True)
    if 'grade_announcement_date' in update_data:
        school.grade_announcement_date = school_update.grade_announcement_date
    
    # Update logo_url if provided (can be None to delete logo)
    # Check using dict to see if field was explicitly set in request
    if 'logo_url' in update_data:
        old_logo = school.logo_url
        # update to new url (can be None to delete)
        school.logo_url = school_update.logo_url
        # commit then delete old file if it was managed by us
        db.commit()
        db.refresh(school)
        # delete old logo file asynchronously / safely
        _safe_delete_logo_file(old_logo)
        return school
    
    db.commit()
    db.refresh(school)
    return school

@router.post("/{school_id}/upload-logo")
def upload_logo(school_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """
    อัพโหลดไฟล์โลโก้สำหรับโรงเรียน
    - เฉพาะ admin เท่านั้น
    - รองรับ PNG, JPG, JPEG, GIF, WebP
    - ขนาดสูงสุด 5 MB
    """
    # ตรวจสอบสิทธิ์
    if getattr(current_user, 'role', None) != 'admin':
        raise HTTPException(status_code=403, detail="Only admin can upload logos")
    
    # ตรวจสอบว่า school มีอยู่
    school = db.query(SchoolModel).filter(SchoolModel.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    # ตรวจสอบประเภทไฟล์
    ALLOWED_TYPES = {"image/png", "image/jpeg", "image/gif", "image/webp"}
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Only image files are allowed (PNG, JPG, GIF, WebP)")
    
    # ตรวจสอบขนาดไฟล์ (5 MB)
    file_size = len(file.file.read())
    file.file.seek(0)
    if file_size > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size must not exceed 5 MB")
    
    try:
        # สร้างชื่อไฟล์เฉพาะตัว (ป้องกันการทับไฟล์เก่า)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"school_{school_id}_{timestamp}_{file.filename}"
        filepath = os.path.join(UPLOAD_DIR, filename)
        
        # บันทึกไฟล์
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Keep old logo path so we can delete it later
        old_logo = school.logo_url
        # อัปเดต logo_url ในฐานข้อมูล
        logo_url = f"/uploads/logos/{filename}"
        school.logo_url = logo_url
        db.commit()
        db.refresh(school)
        # delete old logo file if it was managed here
        _safe_delete_logo_file(old_logo)
        
        return {
            "detail": "Logo uploaded successfully",
            "logo_url": logo_url,
            "school": school
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading logo: {str(e)}")