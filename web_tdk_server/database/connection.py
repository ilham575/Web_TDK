from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy import inspect
from dotenv import load_dotenv
import os

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))  # Load environment variables from .env file

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL")

# Create SQLAlchemy engine
# Use a placeholder if DATABASE_URL is not set (e.g., during some build/discovery phases)
if not DATABASE_URL:
    DATABASE_URL = "sqlite:///./temp_discovery.db"

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
    from models import user, school, announcement, document, subject, subject_student, attendance, grade, schedule, admin_request, evaluation, semester_period
    Base.metadata.create_all(bind=engine)

def migrate_evaluation_schema():
    """Update evaluations table schema"""
    from sqlalchemy import text
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE evaluations ADD COLUMN academic_year VARCHAR(10) NULL"))
            conn.commit()
            print("✓ Added column academic_year to evaluations")
        except Exception:
            pass # Likely already exists
            
        try:
            conn.execute(text("ALTER TABLE evaluations ADD COLUMN semester INT NULL"))
            conn.commit()
            print("✓ Added column semester to evaluations")
        except Exception:
            pass

        try:
            # Try to drop old constraint
            conn.execute(text("ALTER TABLE evaluations DROP INDEX uq_evaluation_student_subject"))
            conn.commit()
            print("✓ Dropped old constraint uq_evaluation_student_subject")
        except Exception:
            pass

        try:
            # Add new constraint involving year/semester
            conn.execute(text("CREATE UNIQUE INDEX uq_evaluation_student_subject_term ON evaluations (student_id, subject_id, academic_year, semester)"))
            conn.commit()
            print("✓ Added new unique constraint uq_evaluation_student_subject_term")
        except Exception:
            pass

