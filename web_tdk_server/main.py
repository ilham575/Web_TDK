from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from auth import create_access_token
from security import get_current_user
from fastapi.security import OAuth2PasswordRequestForm
from database import add_user, get_user, update_user as db_update_user

app = FastAPI()

# Create default admin user in database if not exists
if not get_user("admin"):
    add_user("admin", "admin", "admin")

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
def register(user: User, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can register new users")
    if get_user(user.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    if not add_user(user.email, user.password, user.role):
        raise HTTPException(status_code=400, detail="Failed to register user")
    return {"message": "User registered successfully"}

@app.post("/login", include_in_schema=False)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = get_user(form_data.username)
    if not user or user["password"] != form_data.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    payload = {
        "sub": form_data.username,
        "role": user["role"]
    }
    token = create_access_token(payload)
    return {"access_token": token, "token_type": "bearer", "role": user["role"]}

@app.get("/me")
def read_me(current_user: dict = Depends(get_current_user)):
    return {"email": current_user["email"], "role": current_user["role"]}

@app.put("/update_user")
def update_user(update: UpdateUserRequest):
    user = get_user(update.email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not db_update_user(update.email, update.password, update.role):
        raise HTTPException(status_code=400, detail="Failed to update user")
    return {"message": "User updated successfully"}

@app.get("/")
async def root():
    return {"message": "Hello World"}