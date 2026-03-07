from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import and_
from database.connection import get_db
from routers.user import get_current_user
from models.school_access_control import SchoolAccessControl as SchoolAccessControlModel
from models.school import School as SchoolModel
from schemas.school_access_control import SchoolAccessControl, SchoolAccessControlCreate, SchoolAccessControlUpdate

router = APIRouter(prefix="/schools/access-control", tags=["school-access-control"])

@router.get("/{school_id}", response_model=list[SchoolAccessControl])
def get_school_access_controls(
    school_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Get all access control records for a school (admin and teachers can view)"""
    user_role = getattr(current_user, 'role', None)
    # Allow admin to view, and teachers/students can view but only for their own school
    if current_user.school_id != school_id:
        raise HTTPException(status_code=403, detail="Can only view access controls for your own school")
    
    controls = db.query(SchoolAccessControlModel).filter(
        SchoolAccessControlModel.school_id == school_id
    ).order_by(
        SchoolAccessControlModel.academic_year.desc(),
        SchoolAccessControlModel.semester.desc()
    ).all()
    
    return controls

@router.post("/{school_id}", response_model=SchoolAccessControl, status_code=status.HTTP_201_CREATED)
def create_access_control(
    school_id: int,
    control_data: SchoolAccessControlCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Create a new access control record for a specific year/semester"""
    if getattr(current_user, 'role', None) != 'admin':
        raise HTTPException(status_code=403, detail="Only admin can create access control settings")
    
    if current_user.school_id != school_id:
        raise HTTPException(status_code=403, detail="Can only manage your own school")
    
    # Check if school exists
    school = db.query(SchoolModel).filter(SchoolModel.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    # Check if record already exists for this year/semester
    existing = db.query(SchoolAccessControlModel).filter(
        and_(
            SchoolAccessControlModel.school_id == school_id,
            SchoolAccessControlModel.academic_year == control_data.academic_year,
            SchoolAccessControlModel.semester == control_data.semester
        )
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Access control for year {control_data.academic_year} semester {control_data.semester} already exists"
        )
    
    new_control = SchoolAccessControlModel(
        school_id=school_id,
        academic_year=control_data.academic_year,
        semester=control_data.semester,
        allow_teacher_view_summary=control_data.allow_teacher_view_summary,
        allow_student_view_grades=control_data.allow_student_view_grades
    )
    
    db.add(new_control)
    db.commit()
    db.refresh(new_control)
    
    return new_control

@router.patch("/{school_id}/{academic_year}/{semester}", response_model=SchoolAccessControl)
def update_access_control(
    school_id: int,
    academic_year: str,
    semester: int,
    update_data: SchoolAccessControlUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Update access control settings for a specific year/semester"""
    if getattr(current_user, 'role', None) != 'admin':
        raise HTTPException(status_code=403, detail="Only admin can update access control settings")
    
    if current_user.school_id != school_id:
        raise HTTPException(status_code=403, detail="Can only manage your own school")
    
    control = db.query(SchoolAccessControlModel).filter(
        and_(
            SchoolAccessControlModel.school_id == school_id,
            SchoolAccessControlModel.academic_year == academic_year,
            SchoolAccessControlModel.semester == semester
        )
    ).first()
    
    if not control:
        raise HTTPException(status_code=404, detail="Access control record not found")
    
    update_dict = update_data.dict(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(control, key, value)
    
    db.commit()
    db.refresh(control)
    
    return control

@router.delete("/{school_id}/{academic_year}/{semester}", status_code=status.HTTP_204_NO_CONTENT)
def delete_access_control(
    school_id: int,
    academic_year: str,
    semester: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Delete an access control record"""
    if getattr(current_user, 'role', None) != 'admin':
        raise HTTPException(status_code=403, detail="Only admin can delete access control settings")
    
    if current_user.school_id != school_id:
        raise HTTPException(status_code=403, detail="Can only manage your own school")
    
    control = db.query(SchoolAccessControlModel).filter(
        and_(
            SchoolAccessControlModel.school_id == school_id,
            SchoolAccessControlModel.academic_year == academic_year,
            SchoolAccessControlModel.semester == semester
        )
    ).first()
    
    if not control:
        raise HTTPException(status_code=404, detail="Access control record not found")
    
    db.delete(control)
    db.commit()
    
    return None
