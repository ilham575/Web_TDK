from pydantic import BaseModel

class User(BaseModel):
    email: str
    password: str
    role: str
    school_id: str

class LoginRequest(BaseModel):
    email: str
    password: str

class UpdateUserRequest(BaseModel):
    email: str
    password: str = None
    role: str = None
    school_id: str = None

class UpdatePasswordRequest(BaseModel):
    password: str