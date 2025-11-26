from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

# Base schema
class UserBase(BaseModel):
    username: str
    email: EmailStr
    full_name: str
    role: str = "student"
    school_id: Optional[int] = None

# Schema for creating user
class UserCreate(UserBase):
    password: str

# Schema for updating user
class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    school_id: Optional[int] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

# Schema for response
class User(UserBase):
    id: int
    is_active: bool
    must_change_password: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Login schema
class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user_info: User

# Admin request schema
class AdminRequestCreate(BaseModel):
    username: str
    email: EmailStr
    full_name: str
    password: str
    school_name: str