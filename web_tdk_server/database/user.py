import sqlite3
from typing import Optional
DB_PATH = "./users.db"

def create_user_table():
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

create_user_table()

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
