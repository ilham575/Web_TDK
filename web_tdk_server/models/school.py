from sqlalchemy import Column, Integer, String
from database.connection import Base

class School(Base):
    __tablename__ = "schools"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False, unique=True)
