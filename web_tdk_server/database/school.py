import sqlite3
DB_PATH = "./users.db"

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

def update_school(school_id: str, name: str = None, address: str = None, phone: str = None):
    print("update_school params:", school_id, name, address, phone)
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    # ตรวจสอบว่ามีโรงเรียนนี้ใน db ก่อน
    c.execute("SELECT 1 FROM schools WHERE school_id = ?", (school_id,))
    if not c.fetchone():
        conn.close()
        print("No school found for update. Adding new school.")
        # เพิ่มใหม่
        return add_school(school_id, name or "", address, phone)
    updates = []
    params = []
    if name is not None:
        updates.append("name = ?")
        params.append(name)
    if address is not None:
        updates.append("address = ?")
        params.append(address)
    if phone is not None:
        updates.append("phone = ?")
        params.append(phone)
    if updates:
        sql = f"UPDATE schools SET {', '.join(updates)} WHERE school_id = ?"
        params.append(school_id)
        c.execute(sql, params)
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
