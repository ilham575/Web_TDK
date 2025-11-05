from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy import inspect
from dotenv import load_dotenv
import os

load_dotenv()  # Load environment variables from .env file

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL")

# Create SQLAlchemy engine
engine = create_engine(
    DATABASE_URL,
    echo=False,  # Set to False in production
    pool_pre_ping=True,
    pool_recycle=3600
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class for models
Base = declarative_base()

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def table_exists(table_name):
    inspector = inspect(engine)
    return table_name in inspector.get_table_names()

def create_all_tables():
    # Import models to register them with Base
    from models import user, school, announcement, document, subject, subject_student, attendance, grade, schedule
    Base.metadata.create_all(bind=engine)
