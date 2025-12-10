#!/usr/bin/env python3
"""
Migration script to add grade_level column to users table
Run this after updating the User model
"""

import os
import sys
from pathlib import Path

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

try:
    from database.connection import engine
    from sqlalchemy import text
except ImportError as e:
    print(f"Error importing modules: {e}")
    print("Make sure you have run: pip install -r requirements.txt")
    sys.exit(1)

def run_migration():
    """Run migration to add grade_level column to users table"""
    try:
        with engine.connect() as connection:
            print("🔍 Checking if grade_level column already exists...")
            
            # Check if column already exists
            try:
                connection.execute(text("SELECT grade_level FROM users LIMIT 1"))
                print("✓ Column 'grade_level' already exists in 'users' table")
                return True
            except:
                pass
            
            # Add the column
            print("📝 Adding grade_level column to users table...")
            connection.execute(text("""
                ALTER TABLE users ADD COLUMN grade_level VARCHAR(50) NULL AFTER school_id
            """))
            
            # Create index
            print("📇 Creating index on grade_level column...")
            try:
                connection.execute(text("""
                    CREATE INDEX idx_users_grade_level ON users(grade_level)
                """))
                print("✓ Index created successfully")
            except Exception as e:
                print(f"⚠️  Index creation skipped or already exists: {e}")
            
            connection.commit()
            print("\n✅ Migration completed successfully!")
            print("grade_level column has been added to users table\n")
            return True
            
    except Exception as e:
        print(f"\n❌ Migration failed: {e}\n")
        print("Possible solutions:")
        print("1. Check DATABASE_URL environment variable")
        print("2. Verify MySQL credentials and connection")
        print("3. Ensure tadika_db database exists")
        print("4. Run migration manually using MySQL CLI or Workbench\n")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("Adding grade_level column to users table")
    print("=" * 60)
    print()
    
    success = run_migration()
    sys.exit(0 if success else 1)
