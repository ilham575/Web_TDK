from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

# In-memory user store
users_db = {}

class User(BaseModel):
    email: str
    password: str
    role: str

class LoginRequest(BaseModel):
    email: str
    password: str

class UpdateUserRequest(BaseModel):
    email: str
    password: str = None
    role: str = None

@app.post("/register")
def register(user: User):
    if user.email in users_db:
        raise HTTPException(status_code=400, detail="Email already registered")
    users_db[user.email] = {
        "password": user.password,
        "role": user.role
    }
    return {"message": "User registered successfully"}

@app.post("/login")
def login(login: LoginRequest):
    user = users_db.get(login.email)
    if not user or user["password"] != login.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {"message": "Login successful", "role": user["role"]}

@app.put("/update_user")
def update_user(update: UpdateUserRequest):
    user = users_db.get(update.email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if update.password:
        user["password"] = update.password
    if update.role:
        user["role"] = update.role
    users_db[update.email] = user
    return {"message": "User updated successfully"}

@app.get("/")
async def root():
    return {"message": "Hello World"}