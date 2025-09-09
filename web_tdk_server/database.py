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
    role TEXT NOT NULL
)
''')
conn.commit()
conn.close()

def add_user(email: str, password: str, role: str):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    try:
        c.execute("INSERT INTO users (email, password, role) VALUES (?, ?, ?)", (email, password, role))
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        return False
    conn.close()
    return True

def get_user(email: str) -> Optional[dict]:
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT email, password, role FROM users WHERE email = ?", (email,))
    row = c.fetchone()
    conn.close()
    if row:
        return {"email": row[0], "password": row[1], "role": row[2]}
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
        content TEXT NOT NULL
    )
    ''')
    conn.commit()
    conn.close()


def add_announcement(title: str, content: str):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("INSERT INTO announcements (title, content) VALUES (?, ?)", (title, content))
    conn.commit()
    conn.close()
    return True


def get_announcements():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT id, title, content FROM announcements ORDER BY id DESC")
    rows = c.fetchall()
    conn.close()
    return [{"id": row[0], "title": row[1], "content": row[2]} for row in rows]
