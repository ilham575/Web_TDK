from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from routers.user import router as user_router
from routers.school import router as school_router
from routers.announcement import router as announcement_router
from routers.subject import router as subject_router

# import ฟังก์ชันสร้างตาราง
from database.connection import create_all_tables

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Creating database tables...")
    create_all_tables()
    print("Database tables created successfully!")
    yield

app = FastAPI(lifespan=lifespan)

# เพิ่ม CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # หรือ ["*"] สำหรับทุก origin (ไม่แนะนำ production)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/users/login")

app.include_router(user_router)
app.include_router(school_router)
app.include_router(announcement_router)
app.include_router(subject_router)

@app.get("/", tags=["root"])
def read_root():
    return {"message": "Hello, FastAPI!"}