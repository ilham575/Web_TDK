from pydantic import BaseModel

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

class UpdatePasswordRequest(BaseModel):
    password: str