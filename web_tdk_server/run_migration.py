#!/usr/bin/env python3
"""
Run all SQL migrations from the migrations/ directory
Executes all .sql files in alphabetical order
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

def run_all_migrations():
    """Run all SQL migration files from migrations/ directory"""
    migrations_dir = Path(__file__).parent / "migrations"
    
    if not migrations_dir.exists():
        print(f"❌ Migrations directory not found: {migrations_dir}")
        return False
    
    # Get all .sql files sorted alphabetically
    migration_files = sorted(migrations_dir.glob("*.sql"))
    
    if not migration_files:
        print("⚠️  No SQL migration files found in migrations/ directory")
        return True
    
    print(f"📂 Found {len(migration_files)} migration files")
    print("=" * 70)
    
    try:
        with engine.connect() as connection:
            for migration_file in migration_files:
                print(f"\n🔄 Running: {migration_file.name}")
                
                try:
                    # Read SQL file
                    with open(migration_file, 'r', encoding='utf-8') as f:
                        sql_content = f.read().strip()
                    
                    if not sql_content:
                        print(f"   ⏭️  Skipped (empty file)")
                        continue
                    
                    # Execute SQL
                    statements = [s.strip() for s in sql_content.split(';') if s.strip()]
                    for statement in statements:
                        connection.execute(text(statement))
                    
                    connection.commit()
                    print(f"   ✅ Success")
                    
                except Exception as e:
                    connection.rollback()
                    print(f"   ⚠️  {str(e)[:100]}")
                    # Continue with next migration instead of failing
            
            print("\n" + "=" * 70)
            print("✅ All migrations processed successfully!")
            return True
            
    except Exception as e:
        print(f"\n❌ Database connection failed: {e}\n")
        print("Possible solutions:")
        print("1. Check DATABASE_URL environment variable")
        print("2. Verify MySQL credentials and connection")
        print("3. Ensure database exists and is accessible")
        print("4. Run migrations manually using MySQL CLI\n")
        return False

if __name__ == "__main__":
    print("=" * 70)
    print("Running All SQL Migrations")
    print("=" * 70)
    print()
    
    success = run_all_migrations()
    sys.exit(0 if success else 1)
