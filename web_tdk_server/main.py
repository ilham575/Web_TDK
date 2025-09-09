from fastapi import FastAPI
from router.user import router as user_router
from router.announcement import router as announcement_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # หรือระบุเฉพาะ ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(user_router)
app.include_router(announcement_router)

@app.get("/")
async def root():
    return {"message": "Hello World"}