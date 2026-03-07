import sys
import os

# Add current directory to path so we can import database.connection
sys.path.append(os.getcwd())

from database.connection import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        print("Starting migration...")
        
        # 1. Add columns academic_year
        try:
            conn.execute(text("ALTER TABLE evaluations ADD COLUMN academic_year VARCHAR(10) NULL"))
            print("✓ Added column academic_year")
        except Exception as e:
            print(f"ℹ Column academic_year might already exist: {e}")

        # 2. Add column semester
        try:
            conn.execute(text("ALTER TABLE evaluations ADD COLUMN semester INT NULL"))
            print("✓ Added column semester")
        except Exception as e:
            print(f"ℹ Column semester might already exist: {e}")
            
        # 3. Drop old unique constraint
        # Note: In MySQL, DROP INDEX drops the constraint if it was created as a generic index or unique constraint
        try:
            conn.execute(text("ALTER TABLE evaluations DROP INDEX uq_evaluation_student_subject"))
            print("✓ Dropped old constraint uq_evaluation_student_subject")
        except Exception as e:
            print(f"ℹ Could not drop old constraint (may not exist): {e}")

        # 4. Add new unique constraint
        # Note: MySQL treats NULLs as distinct, so multiple (sid, subid, NULL, NULL) are allowed.
        # This is acceptable as we rely on app logic for enforcement too.
        try:
            conn.execute(text("CREATE UNIQUE INDEX uq_evaluation_student_subject_term ON evaluations (student_id, subject_id, academic_year, semester)"))
            print("✓ Added new unique constraint uq_evaluation_student_subject_term")
        except Exception as e:
            print(f"ℹ New constraint might already exist: {e}")

        print("Migration completed.")

if __name__ == "__main__":
    migrate()
