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
        print(f"✗ Error creating tables: {e}")
        # Re-raise in production to fail fast if database is not accessible
        raise
    
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

# Convert ASGI to WSGI for Firebase Functions
import functions_framework
from asgiref.wsgi import WsgiToAsgi

@functions_framework.http
def api_server(request):
    # Wrap the FastAPI ASGI app with WsgiToAsgi
    from asgiref.sync import async_to_sync
    from starlette.responses import Response
    
    # Create ASGI scope from request
    scope = {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": request.method,
        "scheme": request.scheme,
        "path": request.path,
        "query_string": request.query_string,
        "root_path": "",
        "headers": [(k.lower().encode(), v.encode()) for k, v in request.headers.items()],
        "server": (request.host.split(":")[0], int(request.host.split(":")[1]) if ":" in request.host else 443),
    }
    
    # Handle the request
    async def receive():
        return {
            "type": "http.request",
            "body": request.get_data(),
            "more_body": False,
        }
    
    response_started = False
    response_status = 200
    response_headers = []
    response_body = []
    
    async def send(message):
        nonlocal response_started, response_status, response_headers, response_body
        if message["type"] == "http.response.start":
            response_started = True
            response_status = message["status"]
            response_headers = message.get("headers", [])
        elif message["type"] == "http.response.body":
            response_body.append(message.get("body", b""))
    
    # Call the ASGI app
    import asyncio
    asyncio.run(app(scope, receive, send))
    
    # Build Flask response
    from flask import Response as FlaskResponse
    flask_response = FlaskResponse(
        b"".join(response_body),
        status=response_status,
        headers=[(k.decode(), v.decode()) for k, v in response_headers]
    )
    return flask_response

# เพิ่ม CORS middleware
cors_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173", # Vite default
    "https://tdk-proj-487218.web.app",
    "https://tdk-proj-487218.firebaseapp.com",
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
