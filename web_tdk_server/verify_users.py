from database.connection import engine
from sqlalchemy import text

print('Checking final user state...')
with engine.begin() as conn:
    res = conn.execute(text("SELECT COUNT(*) as total FROM users;"))
    total = res.fetchone()[0]
    print(f'Total users: {total}')
    
    res = conn.execute(text("SELECT id, username, role FROM users ORDER BY id;"))
    rows = res.fetchall()
    print('Users:')
    for row in rows:
        print(f'  ID {row[0]}: {row[1]} ({row[2]})')
