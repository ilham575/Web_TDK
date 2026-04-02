"""
Migration: Remove classroom unique constraint from homeroom_teachers table.
This allows multiple homeroom teachers per classroom while preventing 
one teacher from managing multiple classrooms.
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import inspect, text
from sqlalchemy.exc import OperationalError
from database.connection import engine, SessionLocal
from models.homeroom import HomeroomTeacher


def migrate_remove_classroom_constraint():
    """Remove the classroom unique constraint that was preventing multiple teachers per classroom."""
    
    db = SessionLocal()
    
    try:
        # Get database dialect
        dialect = engine.dialect.name
        
        constraint_name = 'uq_homeroom_classroom_year_semester'
        table_name = 'homeroom_teachers'
        
        print(f"🔄 Attempting to remove constraint '{constraint_name}' from '{table_name}'...")
        print(f"Database dialect: {dialect}")
        
        # Get current constraints
        inspector = inspect(engine)
        constraints = inspector.get_unique_constraints(table_name)
        constraint_exists = any(c['name'] == constraint_name for c in constraints)
        
        if not constraint_exists:
            print(f"✅ Constraint '{constraint_name}' does not exist (already removed or never existed)")
            return True
        
        # Build appropriate SQL for the dialect
        if dialect == 'sqlite':
            # SQLite doesn't support direct DROP CONSTRAINT
            # We need to recreate the table without the constraint
            print("⚠️  SQLite detected - table recreation required...")
            
            with engine.begin() as connection:
                # Disable foreign keys during migration
                connection.execute(text("PRAGMA foreign_keys=OFF"))
                
                # Create new table without the constraint
                connection.execute(text("""
                    CREATE TABLE homeroom_teachers_new AS
                    SELECT * FROM homeroom_teachers
                """))
                
                # Drop old table
                connection.execute(text("DROP TABLE homeroom_teachers"))
                
                # Rename new table
                connection.execute(text("ALTER TABLE homeroom_teachers_new RENAME TO homeroom_teachers"))
                
                # Re-enable foreign keys
                connection.execute(text("PRAGMA foreign_keys=ON"))
            
            print("✅ SQLite table recreated without classroom constraint")
            
        elif dialect == 'postgresql':
            with engine.begin() as connection:
                connection.execute(text(f"""
                    ALTER TABLE {table_name} DROP CONSTRAINT {constraint_name}
                """))
            print(f"✅ PostgreSQL: Dropped constraint '{constraint_name}'")
            
        elif dialect == 'mysql':
            with engine.begin() as connection:
                connection.execute(text(f"""
                    ALTER TABLE {table_name} DROP INDEX {constraint_name}
                """))
            print(f"✅ MySQL: Dropped index '{constraint_name}'")
        
        else:
            print(f"⚠️  Unsupported dialect: {dialect}")
            return False
        
        # Verify the constraint is gone
        inspector = inspect(engine)
        constraints_after = inspector.get_unique_constraints(table_name)
        constraint_still_exists = any(c['name'] == constraint_name for c in constraints_after)
        
        if constraint_still_exists:
            print(f"❌ Constraint still exists after migration!")
            return False
        
        print(f"✅ Migration complete! Constraint '{constraint_name}' successfully removed.")
        print(f"   Remaining constraints: {[c['name'] for c in constraints_after]}")
        
        return True
        
    except OperationalError as e:
        print(f"❌ Database error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False
    finally:
        db.close()


if __name__ == '__main__':
    success = migrate_remove_classroom_constraint()
    sys.exit(0 if success else 1)
