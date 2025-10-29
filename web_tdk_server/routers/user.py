from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import List
from fastapi import Body
import os
import smtplib
from email.message import EmailMessage
from datetime import timedelta

from schemas.user import User, UserCreate, UserUpdate, Token
from models.user import User as UserModel
from database.connection import get_db
from utils.security import hash_password, verify_password, create_access_token, decode_access_token
from typing import List
from sqlalchemy.orm import Session
from io import BytesIO
from fastapi.responses import StreamingResponse

try:
    import openpyxl
    from openpyxl import Workbook
except Exception:
    openpyxl = None

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


@router.post('/forgot_password')
def forgot_password(email: str = Body(..., embed=True), db: Session = Depends(get_db)):
    """Initiate password reset: generate a short-lived token and email it to user (if configured).

    Returns a generic success message. If SMTP is not configured and RETURN_RESET_TOKEN=true, the token
    will be returned in the response (useful for local dev).
    """
    user = db.query(UserModel).filter(UserModel.email == email).first()
    # always respond with generic message to avoid user enumeration
    generic = {"detail": "If an account with that email exists, a reset link has been sent."}
    if not user:
        return generic

    # create reset token (1 hour validity)
    token = create_access_token({"sub": user.username, "action": "reset_password"}, expires_delta=timedelta(hours=1))

    # Attempt to send email if SMTP configured
    smtp_host = os.getenv('SMTP_HOST')
    smtp_port = os.getenv('SMTP_PORT')
    smtp_user = os.getenv('SMTP_USER')
    smtp_pass = os.getenv('SMTP_PASS')
    from_addr = os.getenv('EMAIL_FROM') or smtp_user
    frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')

    if smtp_host and smtp_user and smtp_pass:
        try:
            reset_link = f"{frontend_url}/reset-password?token={token}"
            msg = EmailMessage()
            msg['Subject'] = 'Password reset request'
            msg['From'] = from_addr
            msg['To'] = email
            msg.set_content(f'You requested a password reset. Click the link to reset: {reset_link}\nIf you did not request this, ignore this email.')

            with smtplib.SMTP(smtp_host, int(smtp_port or 25)) as smtp:
                smtp.starttls()
                smtp.login(smtp_user, smtp_pass)
                smtp.send_message(msg)
        except Exception as e:
            # log and still return generic
            print('failed to send reset email', e)
            return generic
        return generic

    # If SMTP not configured, optionally return token for dev convenience
    if os.getenv('RETURN_RESET_TOKEN', 'false').lower() == 'true':
        return {"detail": "No SMTP configured; returning token for development.", "reset_token": token}

    return generic


@router.post('/reset_password')
def reset_password(token: str = Body(...), new_password: str = Body(...), db: Session = Depends(get_db)):
    """Reset a user's password using a valid reset token."""
    try:
        payload = decode_access_token(token)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if payload.get('action') != 'reset_password':
        raise HTTPException(status_code=400, detail='Invalid token action')

    username = payload.get('sub')
    if not username:
        raise HTTPException(status_code=400, detail='Invalid token payload')

    user = db.query(UserModel).filter(UserModel.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail='User not found')

    # update password
    user.hashed_password = hash_password(new_password)
    db.commit()
    return {"detail": "Password updated successfully"}


@router.post('/bulk_upload')
def bulk_upload_users(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    """Upload an Excel (.xlsx) file to bulk-create users.

    Expected columns (first row header): username,email,full_name,password,role,school_id (optional)
    Only admins are allowed to use this endpoint. If school_id is missing for a row, current_user.school_id is used.
    Returns a summary of created users and per-row errors.
    """
    if getattr(current_user, 'role', None) != 'admin':
        raise HTTPException(status_code=403, detail='Not authorized')

    if openpyxl is None:
        raise HTTPException(status_code=500, detail='Server missing openpyxl dependency')

    content = file.file.read()
    try:
        wb = openpyxl.load_workbook(filename=BytesIO(content), read_only=True)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f'Failed to read Excel file: {str(e)}')

    sheet = wb.active
    rows = list(sheet.iter_rows(values_only=True))
    if not rows or len(rows) < 2:
        raise HTTPException(status_code=400, detail='Excel file must contain a header row and at least one data row')

    header = [str(h).strip().lower() if h is not None else '' for h in rows[0]]
    # map header names to indexes
    idx = {name: i for i, name in enumerate(header)}
    required_cols = ['username', 'email', 'full_name', 'password', 'role']
    for col in required_cols:
        if col not in idx:
            raise HTTPException(status_code=400, detail=f'Missing required column: {col}')

    created = []
    errors = []
    for r_i, row in enumerate(rows[1:], start=2):
        try:
            username = row[idx['username']].strip() if row[idx['username']] is not None else ''
            email = row[idx['email']].strip() if row[idx['email']] is not None else ''
            full_name = row[idx['full_name']].strip() if row[idx['full_name']] is not None else ''
            password = row[idx['password']].strip() if row[idx['password']] is not None else ''
            role = row[idx['role']].strip() if row[idx['role']] is not None else ''
            school_id = None
            if 'school_id' in idx and row[idx['school_id']] is not None:
                try:
                    school_id = int(row[idx['school_id']])
                except Exception:
                    school_id = None

            if not username or not email or not password or role not in ('teacher', 'student'):
                raise ValueError('Invalid data - required fields missing or role invalid')

            # default school_id to admin's school if not provided
            if school_id is None:
                school_id = getattr(current_user, 'school_id', None)

            # uniqueness checks
            existing_user = db.query(UserModel).filter((UserModel.username == username) | (UserModel.email == email)).first()
            if existing_user:
                raise ValueError('Username or email already exists')

            hashed = hash_password(password)
            new_user = UserModel(username=username, email=email, full_name=full_name, hashed_password=hashed, role=role, school_id=school_id)
            db.add(new_user)
            db.flush()
            created.append({'row': r_i, 'username': username, 'id': new_user.id})
        except Exception as e:
            errors.append({'row': r_i, 'error': str(e)})

    # commit only after processing all rows to keep atomic-ish behavior for created set
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f'Failed to commit created users: {str(e)}')

    return { 'created_count': len(created), 'created': created, 'errors': errors }

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


@router.get('/bulk_template')
def download_bulk_template(current_user: UserModel = Depends(get_current_user)):
    """Return an Excel template (.xlsx) for admins to fill and upload via /users/bulk_upload."""
    if getattr(current_user, 'role', None) != 'admin':
        raise HTTPException(status_code=403, detail='Not authorized')

    if openpyxl is None:
        raise HTTPException(status_code=500, detail='Server missing openpyxl dependency')

    wb = Workbook()
    ws = wb.active
    # Header row
    headers = ['username', 'email', 'full_name', 'password', 'role', 'school_id']
    ws.append(headers)
    # Example rows
    ws.append(['alice', 'alice@example.com', 'Alice A', 'secret123', 'teacher', ''])
    ws.append(['bob', 'bob@example.com', 'Bob B', 'p@ssw0rd', 'student', ''])

    stream = BytesIO()
    wb.save(stream)
    stream.seek(0)

    filename = 'user_bulk_template.xlsx'
    headers = {
        'Content-Disposition': f'attachment; filename="{filename}"'
    }
    return StreamingResponse(stream, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', headers=headers)