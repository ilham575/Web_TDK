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
import os

# import ฟังก์ชันสร้างตาราง
from database.connection import create_all_tables
# Use the create_tables.ensure_schema to automatically add any new columns
from create_tables import ensure_schema

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Initializing database schema...")
    # Ensure tables exist and add missing columns if any (safe to run multiple times)
    try:
        # create_all_tables still ensures tables exist first
        create_all_tables()
    except Exception:
        # continue - some deployments may not need this and create_all_tables may not be available
        pass
    try:
        ensure_schema()
        print("Database schema ensured successfully!")
    except Exception as e:
        print(f"Warning: failed to ensure schema changes: {e}")
    yield

app = FastAPI(lifespan=lifespan)

# เพิ่ม CORS middleware
cors_origins = os.getenv("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
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

@app.get("/", tags=["root"])
def read_root():
    return {"message": "Hello, FastAPI!"}