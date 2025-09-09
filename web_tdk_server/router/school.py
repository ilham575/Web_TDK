from fastapi import APIRouter, HTTPException
from schema.school import School
from database import (
    create_school_table, add_school, get_schools, get_school,
    update_school, delete_school
)

router = APIRouter()

# สร้างตาราง school ถ้ายังไม่มี
create_school_table()

@router.post("/school", tags=["School"])
def create_school(school: School):
    success = add_school(school.school_id, school.name, school.address, school.phone)
    if not success:
        raise HTTPException(status_code=400, detail="School ID already exists")
    return {"message": "School created successfully"}

@router.get("/school", tags=["School"])
def get_schools_route():
    return get_schools()

@router.get("/school/{school_id}", tags=["School"])
def get_school_route(school_id: str):
    school = get_school(school_id)
    if school:
        return school
    raise HTTPException(status_code=404, detail="School not found")

@router.put("/school/{school_id}", tags=["School"])
def update_school_route(school_id: str, school: School):
    update_school(school_id, school.name, school.address, school.phone)
    return {"message": "School updated successfully"}

@router.delete("/school/{school_id}", tags=["School"])
def delete_school_route(school_id: str):
    delete_school(school_id)
    return {"message": "School deleted successfully"}
