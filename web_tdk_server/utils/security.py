from datetime import datetime, timedelta
from passlib.context import CryptContext
import jwt

# FastAPI imports for dependency
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

# local db dependency import (do not import models at top-level to avoid circular imports)
from database.connection import get_db

# Secret key สำหรับการเข้ารหัส JWT
SECRET_KEY = "your_secret_key"
ALGORITHM = "HS256"

# Default token expiration by role (in minutes)
# IMPORTANT: Owner token expiry is intended to be configured in code only
# (DEFAULT_TOKEN_EXPIRE_MINUTES['owner']). The owner-facing UI and owner
# management APIs must not be able to change the owner value.
DEFAULT_TOKEN_EXPIRE_MINUTES = {
    'owner': 45,
    'admin': 30,
    'teacher': 30,
    'student': 30
}

# Fallback expiration time if no role-specific setting found
ACCESS_TOKEN_EXPIRE_MINUTES = 30



# สร้าง context สำหรับการเข้ารหัสรหัสผ่าน
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

# ฟังก์ชันสำหรับแฮชรหัสผ่าน
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

# ฟังก์ชันสำหรับตรวจสอบรหัสผ่าน
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

# ฟังก์ชันสำหรับสร้าง JWT
def create_access_token(data: dict, expires_delta: timedelta = None, role: str = None):
    # ถ้ากำหนด expires_delta มาให้ ให้ใช้ค่านั้น
    if expires_delta:
        pass
    # ถ้ามีการกำหนด role ให้หาเวลาจาก DEFAULT_TOKEN_EXPIRE_MINUTES
    elif role and role in DEFAULT_TOKEN_EXPIRE_MINUTES:
        expires_delta = timedelta(minutes=DEFAULT_TOKEN_EXPIRE_MINUTES[role])
    # ถ้าไม่มีข้อมูลเพิ่มเติม ให้ใช้ค่า default
    else:
        expires_delta = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = data.copy()
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# ฟังก์ชันสำหรับตรวจสอบ JWT
def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise ValueError("Token has expired")
    except jwt.InvalidTokenError:
        raise ValueError("Invalid token")


# OAuth2 scheme used by FastAPI endpoints
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/users/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """FastAPI dependency to retrieve current user from JWT token.

    This function imports the User model inside the function body to avoid circular imports
    when routers import this utility.
    """
    try:
        payload = decode_access_token(token)
        username = payload.get("sub")
        if not username:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

        # import here to avoid circular import during app startup
        from models.user import User as UserModel

        user = db.query(UserModel).filter(UserModel.username == username).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        return user
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


# Optional OAuth2 scheme for endpoints that allow anonymous access
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/users/login", auto_error=False)

def get_optional_current_user(token: str = Depends(oauth2_scheme_optional), db: Session = Depends(get_db)):
    """Return current user if token present and valid, otherwise None."""
    if not token:
        return None
    try:
        payload = decode_access_token(token)
        username = payload.get("sub")
        if not username:
            return None
        from models.user import User as UserModel
        user = db.query(UserModel).filter(UserModel.username == username).first()
        return user
    except Exception:
        return None