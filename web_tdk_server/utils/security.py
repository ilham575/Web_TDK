from datetime import datetime, timedelta
from passlib.context import CryptContext
import jwt

# Secret key สำหรับการเข้ารหัส JWT
SECRET_KEY = "your_secret_key"
ALGORITHM = "HS256"
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
def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
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