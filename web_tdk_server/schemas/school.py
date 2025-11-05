from pydantic import BaseModel

class SchoolBase(BaseModel):
    name: str

class SchoolCreate(SchoolBase):
    pass

class School(SchoolBase):
    id: int
    class Config:
        # Pydantic v2 renamed 'orm_mode' -> 'from_attributes'
        # keep backward-compatible attribute for v1 style, prefer 'from_attributes'
        from_attributes = True