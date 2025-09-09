import sqlite3
from typing import Optional

DB_PATH = "./users.db"

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

def add_user(email: str, password: str, role: str, school_id: str):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    try:
        c.execute("INSERT INTO users (email, password, role, school_id) VALUES (?, ?, ?, ?)", (email, password, role, school_id))
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        return False
    conn.close()
    return True

def get_user(email: str) -> Optional[dict]:
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT email, password, role, school_id FROM users WHERE email = ?", (email,))
    row = c.fetchone()
    conn.close()
    if row:
        return {"email": row[0], "password": row[1], "role": row[2], "school_id": row[3]}
    return None

def update_user(email: str, password: Optional[str] = None, role: Optional[str] = None):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    if password and role:
        c.execute("UPDATE users SET password = ?, role = ? WHERE email = ?", (password, role, email))
    elif password:
        c.execute("UPDATE users SET password = ? WHERE email = ?", (password, email))
    elif role:
        c.execute("UPDATE users SET role = ? WHERE email = ?", (role, email))
    else:
        conn.close()
        return False
    conn.commit()
    conn.close()
    return True

def create_announcement_table():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
    CREATE TABLE IF NOT EXISTS announcements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        school_id TEXT NOT NULL
    )
    ''')
    conn.commit()
    conn.close()


def add_announcement(title: str, content: str, school_id: str):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("INSERT INTO announcements (title, content, school_id) VALUES (?, ?, ?)", (title, content, school_id))
    conn.commit()
    conn.close()
    return True


def get_announcements(school_id: str):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT id, title, content FROM announcements WHERE school_id = ? ORDER BY id DESC", (school_id,))
    rows = c.fetchall()
    conn.close()
    return [{"id": row[0], "title": row[1], "content": row[2]} for row in rows]

def get_all_announcements():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT id, title, content, school_id FROM announcements ORDER BY id DESC")
    rows = c.fetchall()
    conn.close()
    return [{"id": row[0], "title": row[1], "content": row[2], "school_id": row[3]} for row in rows]

def migrate_announcement_table():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    # สร้างตารางถ้ายังไม่มี
    c.execute('''
    CREATE TABLE IF NOT EXISTS announcements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL
    )
    ''')
    # ตรวจสอบว่ามี school_id หรือยัง
    c.execute("PRAGMA table_info(announcements)")
    columns = [col[1] for col in c.fetchall()]
    if "school_id" not in columns:
        c.execute("ALTER TABLE announcements ADD COLUMN school_id TEXT NOT NULL DEFAULT ''")
        conn.commit()
    conn.close()

def update_announcement(announcement_id: int, title: str = None, content: str = None):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    if title and content:
        c.execute("UPDATE announcements SET title = ?, content = ? WHERE id = ?", (title, content, announcement_id))
    elif title:
        c.execute("UPDATE announcements SET title = ? WHERE id = ?", (title, announcement_id))
    elif content:
        c.execute("UPDATE announcements SET content = ? WHERE id = ?", (content, announcement_id))
    else:
        conn.close()
        return False
    conn.commit()
    conn.close()
    return True

def delete_announcement(announcement_id: int):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("DELETE FROM announcements WHERE id = ?", (announcement_id,))
    conn.commit()
    conn.close()
    return True

def create_school_table():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
    CREATE TABLE IF NOT EXISTS schools (
        school_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT,
        phone TEXT
    )
    ''')
    conn.commit()
    conn.close()


def add_school(school_id: str, name: str, address: str = None, phone: str = None):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    try:
        c.execute("INSERT INTO schools (school_id, name, address, phone) VALUES (?, ?, ?, ?)",
                  (school_id, name, address, phone))
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        return False
    conn.close()
    return True


def get_schools():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT school_id, name, address, phone FROM schools")
    rows = c.fetchall()
    conn.close()
    return [{"school_id": row[0], "name": row[1], "address": row[2], "phone": row[3]} for row in rows]


def get_school(school_id: str):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT school_id, name, address, phone FROM schools WHERE school_id = ?", (school_id,))
    row = c.fetchone()
    conn.close()
    if row:
        return {"school_id": row[0], "name": row[1], "address": row[2], "phone": row[3]}
    return None


def update_school(school_id: str, name: str, address: str = None, phone: str = None):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("UPDATE schools SET name = ?, address = ?, phone = ? WHERE school_id = ?",
              (name, address, phone, school_id))
    conn.commit()
    conn.close()
    return True


def delete_school(school_id: str):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("DELETE FROM schools WHERE school_id = ?", (school_id,))
    conn.commit()
    conn.close()
    return True

# เรียกใช้ migrate_announcement_table() ก่อนสร้างตารางหรือใช้งาน
migrate_announcement_table()
