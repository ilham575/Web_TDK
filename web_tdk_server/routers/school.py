from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File
from sqlalchemy.orm import Session
from schemas.school import SchoolCreate, School, SchoolUpdate, AcademicYearSetup
from models.school import School as SchoolModel
from models.semester_period import SemesterPeriod as SemesterPeriodModel
from database.connection import get_db
from routers.user import get_current_user
from models.user import User as UserModel
from utils.gcs import upload_to_gcs, delete_from_gcs, generate_safe_filename
import os
import shutil
from datetime import datetime

router = APIRouter(prefix="/schools", tags=["schools"])


def require_academic_year_setup(school_id: int, db: Session):
    """Helper: raise 403 if the school has not completed academic year setup.
    Call this before any operation that should be blocked until setup is done."""
    if not school_id:
        return  # no school context → skip check
    school = db.query(SchoolModel).filter(SchoolModel.id == school_id).first()
    if not school:
        return
    if not school.is_academic_year_setup:
        raise HTTPException(
            status_code=403,
            detail="กรุณาตั้งค่าปีการศึกษาและภาคเรียนก่อนดำเนินการ (Academic year setup required)"
        )

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
    
    # Update manual toggles
    if 'can_teacher_view_summary' in update_data:
        school.can_teacher_view_summary = school_update.can_teacher_view_summary
    if 'is_grade_announced' in update_data:
        school.is_grade_announced = school_update.is_grade_announced
    
    # Update access control flags
    if 'is_view_grades_by_year_semester' in update_data:
        school.is_view_grades_by_year_semester = school_update.is_view_grades_by_year_semester
    
    # Update academic year setup fields
    if 'is_academic_year_setup' in update_data:
        school.is_academic_year_setup = school_update.is_academic_year_setup
    if 'current_academic_year' in update_data:
        school.current_academic_year = school_update.current_academic_year
    if 'current_semester' in update_data:
        school.current_semester = school_update.current_semester

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
        # Create unique filename and upload to GCS
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        original_filename = file.filename
        safe_name = generate_safe_filename(original_filename)
        filename = f"school_{school_id}_{timestamp}_{safe_name}"
        
        # Read file content safely
        file_content = file.file.read()
        
        # Upload using the GCS utility
        # We explicitly set public=True so the logo can be viewed by anyone with the link
        logo_url = upload_to_gcs(file_content, filename, content_type=file.content_type, public=True)
        
        if not logo_url:
            raise Exception("GCS upload failed (returned empty URL)")

        # Keep old logo path so we can delete it from GCS later
        old_logo_url = school.logo_url
        
        # อัปเดต logo_url ในฐานข้อมูล (GCS URL จะเป็น https://storage.googleapis.com/...)
        school.logo_url = logo_url
        db.commit()
        db.refresh(school)
        
        # delete old logo file from GCS if it was a GCS URL
        if old_logo_url and "storage.googleapis.com" in old_logo_url:
            # Extract filename from GCS URL
            old_filename = old_logo_url.split("/")[-1]
            delete_from_gcs(old_filename)
        
        return {
            "detail": "Logo uploaded successfully to GCS",
            "logo_url": logo_url,
            "school": school
        }
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error uploading logo to GCS: {str(e)}")


# ============================================================
# Academic Year Setup Endpoint
# ============================================================

@router.post("/{school_id}/setup-academic-year", response_model=School)
def setup_academic_year(
    school_id: int,
    data: AcademicYearSetup,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """ตั้งค่าปีการศึกษาและภาคเรียนเริ่มต้น — ต้องทำก่อนจะเพิ่มผู้ใช้/ชั้นเรียน/รายวิชาได้
    
    This endpoint:
    1. Sets the school's current_academic_year and current_semester
    2. Creates a corresponding SemesterPeriod record
    3. Marks the school as is_academic_year_setup = True
    """
    if getattr(current_user, 'role', None) != 'admin':
        raise HTTPException(status_code=403, detail="เฉพาะแอดมินเท่านั้น")
    
    school = db.query(SchoolModel).filter(SchoolModel.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="ไม่พบโรงเรียน")
    
    if not data.academic_year or not data.semester:
        raise HTTPException(status_code=400, detail="กรุณาระบุปีการศึกษาและภาคเรียน")
    
    # Update school record
    school.current_academic_year = data.academic_year
    school.current_semester = data.semester
    school.is_academic_year_setup = True
    
    # Create or update the SemesterPeriod record
    existing_period = db.query(SemesterPeriodModel).filter(
        SemesterPeriodModel.school_id == school_id,
        SemesterPeriodModel.academic_year == data.academic_year,
        SemesterPeriodModel.semester == data.semester,
    ).first()
    
    if not existing_period:
        period = SemesterPeriodModel(
            school_id=school_id,
            academic_year=data.academic_year,
            semester=data.semester,
        )
        db.add(period)
    
    db.commit()
    db.refresh(school)
    return school


@router.get("/{school_id}/academic-year-status")
def get_academic_year_status(
    school_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """ตรวจสอบสถานะการตั้งค่าปีการศึกษา"""
    school = db.query(SchoolModel).filter(SchoolModel.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="ไม่พบโรงเรียน")
    
    return {
        "is_academic_year_setup": school.is_academic_year_setup,
        "current_academic_year": school.current_academic_year,
        "current_semester": school.current_semester,
    }


@router.patch("/{school_id}/change-semester", response_model=School)
def change_semester(
    school_id: int,
    data: AcademicYearSetup,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """เปลี่ยนปีการศึกษา/ภาคเรียนปัจจุบัน (ใช้ได้หลังจาก setup แล้วเท่านั้น)"""
    if getattr(current_user, 'role', None) != 'admin':
        raise HTTPException(status_code=403, detail="เฉพาะแอดมินเท่านั้น")
    
    school = db.query(SchoolModel).filter(SchoolModel.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="ไม่พบโรงเรียน")
    
    school.current_academic_year = data.academic_year
    school.current_semester = data.semester
    
    # Ensure SemesterPeriod exists
    existing_period = db.query(SemesterPeriodModel).filter(
        SemesterPeriodModel.school_id == school_id,
        SemesterPeriodModel.academic_year == data.academic_year,
        SemesterPeriodModel.semester == data.semester,
    ).first()
    
    if not existing_period:
        period = SemesterPeriodModel(
            school_id=school_id,
            academic_year=data.academic_year,
            semester=data.semester,
        )
        db.add(period)
    
    db.commit()
    db.refresh(school)
    return school