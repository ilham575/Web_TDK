# วิธีการเพิ่มคอลัมน์ grade_level ให้ตาราง users

## วิธีที่ 1: ใช้ MySQL CLI โดยตรง

```bash
# เชื่อมต่อ MySQL และ execute SQL
mysql -u admin_tdk -p tadika_db < migrations/add_grade_level_to_users.sql
```

## วิธีที่ 2: ใช้ Python script

สร้างไฟล์ `run_migration.py` ในโฟลเดอร์ root:

```python
import os
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from database.connection import SessionLocal, engine
from sqlalchemy import text

def run_migration():
    """Run migration to add grade_level column"""
    try:
        with engine.connect() as connection:
            # Check if column already exists
            try:
                connection.execute(text("SELECT grade_level FROM users LIMIT 1"))
                print("✓ Column 'grade_level' already exists in 'users' table")
                return True
            except:
                pass
            
            # Add the column
            print("Adding grade_level column to users table...")
            connection.execute(text("""
                ALTER TABLE users ADD COLUMN grade_level VARCHAR(50) NULL AFTER school_id
            """))
            
            # Create index
            print("Creating index on grade_level column...")
            try:
                connection.execute(text("""
                    CREATE INDEX idx_users_grade_level ON users(grade_level)
                """))
            except:
                print("Index may already exist or couldn't be created")
            
            connection.commit()
            print("✓ Migration completed successfully!")
            return True
    except Exception as e:
        print(f"✗ Migration failed: {e}")
        return False

if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)
```

จากนั้น execute:
```bash
cd web_tdk_server
python run_migration.py
```

## วิธีที่ 3: ใช้ MySQL Workbench หรือ phpMyAdmin

1. เปิด MySQL Workbench / phpMyAdmin
2. ไปที่ฐานข้อมูล `tadika_db`
3. เปิดตาราง `users`
4. ใน SQL tab ให้ paste SQL command:

```sql
ALTER TABLE users ADD COLUMN grade_level VARCHAR(50) NULL AFTER school_id;
CREATE INDEX idx_users_grade_level ON users(grade_level);
```

5. Execute

## ตรวจสอบหลังจาก Migration

```sql
-- ตรวจสอบว่าคอลัมน์มีอยู่หรือไม่
DESC users;
-- ควรเห็น grade_level ในรายการ

-- ยืนยันเพิ่มเติม
SHOW COLUMNS FROM users LIKE 'grade_level';
```
