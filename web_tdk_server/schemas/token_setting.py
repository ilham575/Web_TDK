from pydantic import BaseModel

class TokenExpireSettingBase(BaseModel):
    role: str
    expire_minutes: int

class TokenExpireSettingCreate(TokenExpireSettingBase):
    pass

class TokenExpireSettingUpdate(TokenExpireSettingBase):
    pass

class TokenExpireSettingResponse(TokenExpireSettingBase):
    id: int
    school_id: int

    class Config:
        from_attributes = True

class TokenExpireSettingsResponse(BaseModel):
    """Response containing all token expire settings for a school"""
    owner: int
    admin: int
    teacher: int
    student: int

class TokenExpireSettingsUpdate(BaseModel):
    """Request for updating token expire settings (owner is code-controlled)"""
    admin: int
    teacher: int
    student: int
