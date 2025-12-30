from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from schemas.school_deletion_request import SchoolDeletionRequestCreate, SchoolDeletionRequest
from models.school_deletion_request import SchoolDeletionRequest as SchoolDeletionRequestModel
from models.school import School as SchoolModel
from database.connection import get_db
from routers.user import get_current_user
from models.user import User as UserModel

router = APIRouter(prefix="/admin", tags=["admin"])

def require_admin(current_user: UserModel = Depends(get_current_user)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Only admins can access this resource")
    return current_user

@router.post("/request_school_deletion", response_model=SchoolDeletionRequest, status_code=status.HTTP_201_CREATED)
def request_school_deletion(
    request: SchoolDeletionRequestCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_admin)
):
    """Admin requests deletion of their school. Only admins can make this request."""

    # Verify the admin belongs to the school they're requesting to delete
    if current_user.school_id != request.school_id:
        raise HTTPException(status_code=403, detail="You can only request deletion for your own school")

    # Check if school exists
    school = db.query(SchoolModel).filter(SchoolModel.id == request.school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    # Check if there's already a pending request for this school
    existing_request = db.query(SchoolDeletionRequestModel).filter(
        SchoolDeletionRequestModel.school_id == request.school_id,
        SchoolDeletionRequestModel.status == "pending"
    ).first()
    if existing_request:
        raise HTTPException(status_code=400, detail="There's already a pending deletion request for this school")

    # Create the deletion request
    deletion_request = SchoolDeletionRequestModel(
        school_id=request.school_id,
        requested_by=current_user.id,
        reason=request.reason,
        status="pending"
    )

    db.add(deletion_request)
    db.commit()
    db.refresh(deletion_request)
    return deletion_request

@router.get("/school_deletion_requests", response_model=list[SchoolDeletionRequest])
def get_school_deletion_requests(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_admin)
):
    """Admin can view their own school's deletion requests."""

    requests = db.query(SchoolDeletionRequestModel).filter(
        SchoolDeletionRequestModel.school_id == current_user.school_id
    ).order_by(SchoolDeletionRequestModel.created_at.desc()).all()

    return requests