import sqlite3
from typing import Optional

DB_PATH = "./users.db"

# ฟังก์ชันเกี่ยวกับ user
from database.user import create_user_table, add_user, get_user, update_user
# ฟังก์ชันเกี่ยวกับ announcement
from database.announcement import (
    create_announcement_table, add_announcement, get_announcements,
    get_all_announcements, migrate_announcement_table,
    update_announcement, delete_announcement, delete_related_by_school_id
)
# ฟังก์ชันเกี่ยวกับ school
from database.school import (
    create_school_table, add_school, get_schools, get_school,
    update_school, delete_school
)

# สร้างตาราง user ถ้ายังไม่มี
conn = sqlite3.connect(DB_PATH)
c = conn.cursor()
c.execute('''
CREATE TABLE IF NOT EXISTS users (
    email TEXT PRIMARY KEY,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    school_id TEXT NOT NULL
)
''')
conn.commit()
conn.close()

# เรียกใช้ migrate_announcement_table() ก่อนสร้างตารางหรือใช้งาน
migrate_announcement_table()
