from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from schemas.school import SchoolCreate, School
from models.school import School as SchoolModel
from database.connection import get_db

router = APIRouter(prefix="/schools", tags=["schools"])

@router.post("/", response_model=School, status_code=status.HTTP_201_CREATED)
def create_school(school: SchoolCreate, db: Session = Depends(get_db)):
    db_school = db.query(SchoolModel).filter(SchoolModel.name == school.name).first()
    if db_school:
        raise HTTPException(status_code=400, detail="School already exists")
    new_school = SchoolModel(name=school.name)
    db.add(new_school)
    db.commit()
    db.refresh(new_school)
    return new_school

@router.get("/", response_model=list[School])
def list_schools(db: Session = Depends(get_db)):
    return db.query(SchoolModel).all()