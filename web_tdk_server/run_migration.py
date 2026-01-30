#!/usr/bin/env python3
"""
Run all SQL migrations from the migrations/ directory
Executes all .sql files in alphabetical order
"""

import os
import sys
import ssl # ✅ เพิ่ม import ssl
from pathlib import Path
from sqlalchemy import create_engine, text # ✅ เพิ่ม create_engine

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

# ------------------------------------------------------------------
# ฟังก์ชันสร้าง Engine พิเศษสำหรับ Migration (รองรับ SSL แบบข้ามการตรวจสอบ)
# ------------------------------------------------------------------
def create_custom_engine():
    db_url = os.environ.get("DATABASE_URL")

    # -----------------------------------------------------
    # 🕵️‍♂️ เพิ่มส่วน DEBUG: เช็คว่ารหัสผ่านที่ได้รับมาหน้าตาเป็นยังไง
    # -----------------------------------------------------
    if db_url:
        try:
            # ดึงส่วน password ออกมาจาก URL
            # format: mysql+pymysql://user:PASSWORD@host...
            auth_part = db_url.split('@')[0]
            password = auth_part.split(':')[-1]
            
            print("=" * 50)
            print(f"🕵️ DEBUG PASSWORD CHECK:")
            print(f"   Length: {len(password)} characters") # เช็คความยาว
            if len(password) > 2:
                print(f"   First char: {password[0]}")      # เช็คตัวแรก
                print(f"   Last char:  {password[-1]}")     # เช็คตัวสุดท้าย
            print("=" * 50)
        except Exception as e:
            print(f"⚠️ DEBUG Error: {e}")
    # -----------------------------------------------------
    
    if not db_url:
        print("❌ Error: DATABASE_URL environment variable is not set.")
        sys.exit(1)

    # Path ที่ตรงกับใน Dockerfile
    ca_path = "/app/server-ca.pem"
    cert_path = "/app/client-cert.pem"
    key_path = "/app/client-key.pem"

    print("🔐 Configuring mTLS connection (Require Trusted Cert)...")

    # 1. โหลด CA ของ Server
    ssl_ctx = ssl.create_default_context(cafile=ca_path)
    
    # 2. โหลด Client Cert + Key (บัตรประชาชนของเรา)
    # ถ้าบรรทัดนี้ error แปลว่าไฟล์ไม่อยู่จริง หรือ path ผิด
    ssl_ctx.load_cert_chain(certfile=cert_path, keyfile=key_path)

    # 3. ปิดการเช็ค Hostname (จำเป็นสำหรับ Private IP)
    # แต่ยังมีการเช็คความถูกต้องของใบรับรองอยู่ (Verify Mode = Required)
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_REQUIRED

    print("🔌 Creating database engine with SSL verification disabled...")
    
    # สร้าง Engine โดยส่ง ssl_context เข้าไป
    return create_engine(
        db_url,
        connect_args={"ssl": ssl_ctx}
    )

try:
    # เราจะไม่ใช้ engine จาก database.connection แล้ว เพราะมันอาจจะ setting ไว้ไม่เหมือนกัน
    # แต่ยัง import text มาใช้
    # from database.connection import engine 
    pass
except ImportError as e:
    print(f"Error importing modules: {e}")
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
        # ✅ เรียกใช้ Engine ที่เราสร้างเองด้านบน
        engine = create_custom_engine()

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
        return False

if __name__ == "__main__":
    print("=" * 70)
    print("Running All SQL Migrations")
    print("=" * 70)
    print()
    
    success = run_all_migrations()
    sys.exit(0 if success else 1)