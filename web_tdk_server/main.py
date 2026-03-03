from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routers.user import router as user_router
from routers.school import router as school_router
from routers.announcement import router as announcement_router
from routers.subject import router as subject_router
from routers.attendance import router as attendance_router
from routers.grades import router as grades_router
from routers.schedule import router as schedule_router
from routers.owner import router as owner_router
from routers.absence import router as absence_router
from routers.homeroom import router as homeroom_router
from routers.classroom import router as classroom_router
from routers.admin import router as admin_router
from routers.evaluation import router as evaluation_router
import os

# import ฟังก์ชันสร้างตาราง
from database.connection import create_all_tables

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Initializing database schema...")
    # Ensure tables exist and add missing columns if any (safe to run multiple times)
    try:
        # create_all_tables ensures tables exist first
        create_all_tables()
        print("✓ Database tables created successfully!")
    except Exception as e:
        print(f"⚠ Warning: Database initialization failed (server will still start): {e}")
        # Don't re-raise - let server start even if DB is not ready
        # This allows for graceful startup with pending database setup
    
    try:
        # Try to run schema updates if create_tables module exists
        from create_tables import ensure_schema
        ensure_schema()
        print("✓ Database schema updated successfully!")
    except ImportError:
        print("⚠ create_tables module not found, skipping schema updates")
    except Exception as e:
        print(f"⚠ Warning: failed to ensure schema changes: {e}")
    yield

app = FastAPI(lifespan=lifespan)

# เพิ่ม CORS middleware
cors_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173", # Vite default
    "https://tdk-proj-489111.web.app",
    "https://tdk-proj-489111.firebaseapp.com",
]
# If CORS_ORIGINS environment variable is set, add those too
env_origins = os.getenv("CORS_ORIGINS")
if env_origins:
    cors_origins.extend(env_origins.split(","))

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex="http://localhost:.*", # Allow any port on localhost
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files directory สำหรับให้ serve ไฟล์อัพโหลด (logos)
if not os.path.exists("uploads"):
    os.makedirs("uploads")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/users/login")

app.include_router(user_router)
app.include_router(school_router)
app.include_router(announcement_router)
app.include_router(subject_router)
app.include_router(attendance_router)
app.include_router(grades_router)
app.include_router(schedule_router)
app.include_router(owner_router)
app.include_router(absence_router)
app.include_router(homeroom_router)
app.include_router(classroom_router)
app.include_router(admin_router)
app.include_router(evaluation_router)

@app.get("/", tags=["root"])
def read_root():
    return {"message": "Hello, FastAPI!"}
@app.post("/init-database", tags=["admin"])
def initialize_database():
    """Initialize database tables - call this endpoint once after deployment"""
    try:
        from database.connection import create_all_tables
        create_all_tables()
        return {"status": "success", "message": "Database tables created successfully!"}
    except Exception as e:
        import traceback
        return {"status": "error", "message": str(e), "traceback": traceback.format_exc()}

@app.post("/create-owner-user", tags=["admin"])
def create_owner_user():
    """Create default owner user - run once after init-database"""
    try:
        from database.connection import SessionLocal
        from models.user import User
        from utils.security import hash_password, verify_password
        
        db = SessionLocal()
        
        # Check if owner already exists
        existing = db.query(User).filter(User.username == "owner").first()
        if existing:
            return {
                "status": "info",
                "message": "Owner user already exists",
                "username": existing.username,
                "role": existing.role
            }
        
        # Create owner user
        hashed = hash_password("owner123")
        owner = User(
            username="owner",
            email="owner@example.com",
            full_name="System Owner",
            hashed_password=hashed,
            role="owner",
            must_change_password=True
        )
        db.add(owner)
        db.commit()
        db.close()
        
        return {
            "status": "success",
            "message": "Owner user created successfully!",
            "username": "owner",
            "temporary_password": "owner123",
            "warning": "IMPORTANT: Owner must change this temporary password on first login!"
        }
    except Exception as e:
        import traceback
        return {
            "status": "error",
            "message": str(e),
            "traceback": traceback.format_exc()
        }
