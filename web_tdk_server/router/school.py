from fastapi import APIRouter, HTTPException, Depends
from schema.school import School, SchoolUpdate, SchoolCreate
from database import (
    create_school_table, add_school, get_schools, get_school,
    update_school, delete_school, delete_related_by_school_id
)
from security import get_current_user
import logging

router = APIRouter()

# สร้างตาราง school ถ้ายังไม่มี
create_school_table()

@router.post("/school", tags=["School"])
def create_school(school: SchoolCreate):
    # หา school_id ล่าสุดแล้ว +1
    schools = get_schools()
    if schools:
        last_id = max(int(s["school_id"]) for s in schools if str(s["school_id"]).isdigit())
        school_id = str(last_id + 1)
    else:
        school_id = "1"
    success = add_school(school_id, school.name, school.address, school.phone)
    if not success:
        raise HTTPException(status_code=400, detail="School ID already exists")
    return {"message": "School created successfully", "school_id": school_id}

@router.get("/school", tags=["School"])
def get_schools_route():
    return get_schools()

@router.get("/school/{school_id}", tags=["School"])
def get_school_route(school_id: str):
    school = get_school(school_id)
    if school:
        return school
    raise HTTPException(status_code=404, detail="School not found")

@router.get("/school/me", tags=["School"])
def get_my_school(current_user: dict = Depends(get_current_user)):
    school_id = current_user["school_id"]
    school = get_school(school_id)
    logging.warning(f"school_id: {school_id}")
    logging.warning(f"school: {school}")
    if school:
        return school
    raise HTTPException(status_code=404, detail="School not found")

@router.put("/school/me", tags=["School"])
def update_my_school(school: SchoolUpdate, current_user: dict = Depends(get_current_user)):
    school_id = current_user["school_id"]
    update_school(school_id, school.name, school.address, school.phone)
    return {"message": "School updated successfully"}

@router.delete("/school/{school_id}", tags=["School"])
def delete_school_route(school_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" or current_user["school_id"] != "global":
        raise HTTPException(status_code=403, detail="Only global admin can delete schools")
    delete_related_by_school_id(school_id)
    delete_school(school_id)
    return {"message": "School and related data deleted successfully"}
