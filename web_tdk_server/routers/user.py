from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import List

from schemas.user import User, UserCreate, UserUpdate, Token
from models.user import User as UserModel
from database.connection import get_db
from utils.security import hash_password, verify_password, create_access_token, decode_access_token

# สร้าง router พร้อมกำหนด prefix
router = APIRouter(prefix="/users", tags=["users"])

# กำหนด OAuth2 Security Scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/users/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Get current user from JWT token"""
    try:
        payload = decode_access_token(token)
        username = payload.get("sub")
        if not username:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = db.query(UserModel).filter(UserModel.username == username).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

@router.get("/", response_model=List[User])
def get_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """ดึงข้อมูลผู้ใช้งานทั้งหมด"""
    users = db.query(UserModel).offset(skip).limit(limit).all()
    return users

@router.post("/", response_model=User, status_code=status.HTTP_201_CREATED)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    """เพิ่มผู้ใช้งานใหม่"""
    # Check if username already exists
    db_user = db.query(UserModel).filter(UserModel.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Check if email already exists
    db_email = db.query(UserModel).filter(UserModel.email == user.email).first()
    if db_email:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    # Hash password and create user
    hashed_password = hash_password(user.password)
    db_user = UserModel(
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        hashed_password=hashed_password,
        role=user.role,
        school_id=user.school_id
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """ล็อกอินและสร้าง JWT"""
    user = db.query(UserModel).filter(UserModel.username == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive"
        )
    
    access_token = create_access_token(data={"sub": user.username})
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user_info": user
    }

@router.get("/me", response_model=User)
def get_current_user_info(current_user: UserModel = Depends(get_current_user)):
    """ดึงข้อมูลผู้ใช้งานปัจจุบันจาก JWT"""
    return current_user

@router.put("/me", response_model=User)
def update_current_user(
    user_update: UserUpdate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """อัปเดตข้อมูลผู้ใช้งานปัจจุบัน"""
    for field, value in user_update.dict(exclude_unset=True).items():
        setattr(current_user, field, value)
    
    db.commit()
    db.refresh(current_user)
    return current_user