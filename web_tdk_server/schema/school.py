from pydantic import BaseModel

class School(BaseModel):
    school_id: str
    name: str
    address: str = None
    phone: str = None
