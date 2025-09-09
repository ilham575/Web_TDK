import sqlite3
DB_PATH = "./users.db"

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
    c.execute('''
    CREATE TABLE IF NOT EXISTS announcements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL
    )
    ''')
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

def delete_related_by_school_id(school_id: str):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("DELETE FROM users WHERE school_id = ?", (school_id,))
    c.execute("DELETE FROM announcements WHERE school_id = ?", (school_id,))
    conn.commit()
    conn.close()
