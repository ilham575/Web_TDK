from pydantic import BaseModel

class BaseSchool(BaseModel):
    name: str
    address: str = None
    phone: str = None

class School(BaseSchool):
    school_id: str

class SchoolUpdate(BaseSchool):
    pass

class SchoolCreate(BaseSchool):
    pass