from sqlalchemy import create_engine, text
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
    from models import user, school, announcement, document, subject, subject_student, attendance, grade, schedule, admin_request, evaluation, semester_period, homeroom, absence, social_account
    Base.metadata.create_all(bind=engine)
    migrate_homeroom_schema()
    migrate_user_status_schema()
    migrate_schedule_slot_break_schema()
    migrate_break_schedule_classroom_schema()
    migrate_admin_request_google_schema()

def migrate_user_status_schema():
    """Add user_status column to users table if it doesn't exist."""
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return
    column_names = {col["name"] for col in inspector.get_columns("users")}
    if "user_status" not in column_names:
        with engine.connect() as conn:
            try:
                conn.execute(text("ALTER TABLE users ADD COLUMN user_status VARCHAR(20) NOT NULL DEFAULT 'active'"))
                conn.commit()
                # Sync existing inactive users
                conn.execute(text("UPDATE users SET user_status = 'inactive' WHERE is_active = 0 AND user_status = 'active'"))
                conn.commit()
                print("✓ Added column user_status to users")
            except Exception as e:
                print(f"migrate_user_status_schema: {e}")


def migrate_schedule_slot_break_schema():
    """Add the is_break column to schedule slots if it doesn't exist."""
    inspector = inspect(engine)
    if "schedule_slots" not in inspector.get_table_names():
        return

    column_names = {col["name"] for col in inspector.get_columns("schedule_slots")}
    if "is_break" in column_names:
        return

    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE schedule_slots ADD COLUMN is_break BOOLEAN NOT NULL DEFAULT 0"))
            conn.commit()
            print("✓ Added column is_break to schedule_slots")
        except Exception as e:
            print(f"migrate_schedule_slot_break_schema: {e}")


def migrate_break_schedule_classroom_schema():
    """Add the classroom_id column to break_schedules if it doesn't exist."""
    inspector = inspect(engine)
    if "break_schedules" not in inspector.get_table_names():
        return

    column_names = {col["name"] for col in inspector.get_columns("break_schedules")}
    if "classroom_id" in column_names:
        return

    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE break_schedules ADD COLUMN classroom_id INTEGER NULL"))
            conn.commit()
            print("✓ Added column classroom_id to break_schedules")
        except Exception as e:
            print(f"migrate_break_schedule_classroom_schema: {e}")


def migrate_admin_request_google_schema():
    """Add Google link fields to admin_requests if they don't exist."""
    inspector = inspect(engine)
    if "admin_requests" not in inspector.get_table_names():
        return

    column_names = {col["name"] for col in inspector.get_columns("admin_requests")}
    statements = []

    if "social_provider" not in column_names:
        statements.append("ALTER TABLE admin_requests ADD COLUMN social_provider VARCHAR(32) NULL")
    if "social_provider_user_id" not in column_names:
        statements.append("ALTER TABLE admin_requests ADD COLUMN social_provider_user_id VARCHAR(255) NULL")
    if "social_provider_email" not in column_names:
        statements.append("ALTER TABLE admin_requests ADD COLUMN social_provider_email VARCHAR(255) NULL")
    if "social_email_verified" not in column_names:
        statements.append("ALTER TABLE admin_requests ADD COLUMN social_email_verified BOOLEAN NOT NULL DEFAULT 0")

    if not statements:
        return

    with engine.connect() as conn:
        for statement in statements:
            try:
                conn.execute(text(statement))
                conn.commit()
            except Exception as e:
                print(f"migrate_admin_request_google_schema: {e}")

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


def migrate_homeroom_schema():
    """Update homeroom schema to support semester-aware assignments."""
    inspector = inspect(engine)
    if "homeroom_teachers" not in inspector.get_table_names():
        return

    column_names = {column["name"] for column in inspector.get_columns("homeroom_teachers")}
    dialect = engine.dialect.name

    with engine.connect() as conn:
        if "semester" not in column_names:
            try:
                conn.execute(text("ALTER TABLE homeroom_teachers ADD COLUMN semester INTEGER NULL"))
                conn.commit()
                print("✓ Added column semester to homeroom_teachers")
            except Exception:
                pass

        try:
            conn.execute(text(
                """
                UPDATE homeroom_teachers AS hr
                JOIN classrooms AS c ON c.id = hr.classroom_id
                SET hr.semester = c.semester
                WHERE hr.classroom_id IS NOT NULL AND hr.semester IS NULL
                """
            ))
            conn.commit()
        except Exception:
            pass

        old_indexes = [
            "uq_homeroom_teacher_school_year",
            "uq_homeroom_classroom_year",
        ]
        for index_name in old_indexes:
            try:
                if dialect == "sqlite":
                    conn.execute(text(f"DROP INDEX IF EXISTS {index_name}"))
                else:
                    conn.execute(text(f"ALTER TABLE homeroom_teachers DROP INDEX {index_name}"))
                conn.commit()
                print(f"✓ Dropped legacy homeroom index {index_name}")
            except Exception:
                pass

        new_indexes = {
            "uq_homeroom_teacher_school_year_semester": "CREATE UNIQUE INDEX uq_homeroom_teacher_school_year_semester ON homeroom_teachers (teacher_id, school_id, academic_year, semester)",
            "uq_homeroom_classroom_year_semester": "CREATE UNIQUE INDEX uq_homeroom_classroom_year_semester ON homeroom_teachers (classroom_id, academic_year, semester)",
        }
        for index_name, statement in new_indexes.items():
            try:
                conn.execute(text(statement))
                conn.commit()
                print(f"✓ Added homeroom index {index_name}")
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

