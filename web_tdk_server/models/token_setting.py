from sqlalchemy import Column, Integer, String
from database.connection import Base

class TokenExpireSetting(Base):
    """
    เก็บค่ากำหนดอายุ token สำหรับแต่ละ role ของแต่ละโรงเรียน
    """
    __tablename__ = "token_expire_settings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    school_id = Column(Integer, nullable=False, index=True)
    role = Column(String(50), nullable=False)  # owner, admin, teacher, student
    expire_minutes = Column(Integer, nullable=False)  # เวลาอายุ token (นาที)

    def __repr__(self):
        return f"<TokenExpireSetting(school_id={self.school_id}, role='{self.role}', expire_minutes={self.expire_minutes})>"
