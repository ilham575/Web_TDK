from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordRequestForm
from auth import create_access_token
from security import get_current_user
from database import add_user, get_user, update_user as db_update_user, get_school
from pydantic import BaseModel
from schema.user import User, UpdatePasswordRequest

router = APIRouter()

# Create default admin user in database if not exists
if not get_user("admin"):
    add_user("admin", "admin", "admin", "global")

@router.post("/register")
def register(user: User, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can register new users")
    if get_user(user.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    if not get_school(user.school_id):
        raise HTTPException(status_code=400, detail="School ID does not exist")
    if not add_user(user.email, user.password, user.role, user.school_id):
        raise HTTPException(status_code=400, detail="Failed to register user")
    return {"message": "User registered successfully"}

@router.post("/login", include_in_schema=False)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = get_user(form_data.username)
    if not user or user["password"] != form_data.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    payload = {
        "sub": form_data.username,
        "role": user["role"],
        "school_id": user["school_id"]  # เพิ่มตรงนี้
    }
    token = create_access_token(payload)
    return {"access_token": token, "token_type": "bearer", "role": user["role"]}

@router.get("/me")
def read_me(current_user: dict = Depends(get_current_user)):
    return {
        "email": current_user["email"],
        "role": current_user["role"],
        "school_id": current_user["school_id"]  # เพิ่มตรงนี้
    }

@router.put("/update_user")
def update_user(update: UpdatePasswordRequest, current_user: dict = Depends(get_current_user)):
    email = current_user["email"]
    user = get_user(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not update.password:
        raise HTTPException(status_code=400, detail="Password is required to update")
    if not db_update_user(email, update.password, None):
        raise HTTPException(status_code=400, detail="Failed to update user")
    return {"message": "User updated successfully"}
