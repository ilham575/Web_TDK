from datetime import datetime, timedelta
import os

from dotenv import load_dotenv
from passlib.context import CryptContext
import jwt

# FastAPI imports for dependency
from fastapi import Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

# local db dependency import (do not import models at top-level to avoid circular imports)
from database.connection import get_db

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

# Secret key สำหรับการเข้ารหัส JWT
INVALID_SECRET_VALUES = {
    "your_secret_key",
    "your-super-secret-jwt-key-change-this-in-production",
    "replace-with-a-generated-secret",
    "set-from-secret-manager",
    "changeme",
    "secret",
}

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY or SECRET_KEY.strip() in INVALID_SECRET_VALUES:
    raise RuntimeError(
        "JWT_SECRET_KEY must be set to a strong, unique value in the environment before the server starts."
    )

ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_COOKIE_NAME = os.getenv("JWT_COOKIE_NAME", "access_token")
COOKIE_SECURE = os.getenv("JWT_COOKIE_SECURE", "auto").lower()
COOKIE_SAMESITE = os.getenv(
    "JWT_COOKIE_SAMESITE",
    "none" if os.getenv("ENV", "development").lower() == "production" else "lax",
).lower()

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
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "30"))



# สร้าง context สำหรับการเข้ารหัสรหัสผ่าน
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

# ฟังก์ชันสำหรับแฮชรหัสผ่าน
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

# ฟังก์ชันสำหรับตรวจสอบรหัสผ่าน
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def resolve_access_token_ttl(expires_delta: timedelta = None, role: str = None) -> timedelta:
    if expires_delta:
        return expires_delta
    if role and role in DEFAULT_TOKEN_EXPIRE_MINUTES:
        return timedelta(minutes=DEFAULT_TOKEN_EXPIRE_MINUTES[role])
    return timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

# ฟังก์ชันสำหรับสร้าง JWT
def create_access_token(data: dict, expires_delta: timedelta = None, role: str = None):
    expires_delta = resolve_access_token_ttl(expires_delta=expires_delta, role=role)

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


def _use_secure_cookie() -> bool:
    if COOKIE_SECURE == "true":
        return True
    if COOKIE_SECURE == "false":
        return False
    return os.getenv("ENV", "development").lower() == "production"


def set_auth_cookie(response: Response, token: str, expires_delta: timedelta = None, role: str = None):
    max_age_seconds = max(1, int(resolve_access_token_ttl(expires_delta=expires_delta, role=role).total_seconds()))
    response.set_cookie(
        key=ACCESS_TOKEN_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=_use_secure_cookie(),
        samesite=COOKIE_SAMESITE,
        max_age=max_age_seconds,
        path="/",
    )


def clear_auth_cookie(response: Response):
    response.delete_cookie(
        key=ACCESS_TOKEN_COOKIE_NAME,
        httponly=True,
        secure=_use_secure_cookie(),
        samesite=COOKIE_SAMESITE,
        path="/",
    )


def get_request_token(request: Request) -> str | None:
    cookie_token = request.cookies.get(ACCESS_TOKEN_COOKIE_NAME)
    if cookie_token:
        return cookie_token

    authorization = request.headers.get("Authorization", "")
    scheme, _, credentials = authorization.partition(" ")
    if scheme.lower() == "bearer" and credentials and credentials != "cookie-authenticated":
        return credentials
    return None


# OAuth2 scheme used by FastAPI endpoints
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/users/login")


def get_current_user(request: Request, db: Session = Depends(get_db)):
    """FastAPI dependency to retrieve current user from JWT token.

    This function imports the User model inside the function body to avoid circular imports
    when routers import this utility.
    """
    token = get_request_token(request)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

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

def get_optional_current_user(request: Request, db: Session = Depends(get_db)):
    """Return current user if token present and valid, otherwise None."""
    token = get_request_token(request)
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