from database.connection import engine
from sqlalchemy import text

print('Deleting all users except owner and admin...')
with engine.begin() as conn:
    # Disable FK checks temporarily
    conn.execute(text('SET FOREIGN_KEY_CHECKS=0;'))
    
    # Delete all non-owner/admin users
    res = conn.execute(text("DELETE FROM users WHERE role NOT IN ('owner', 'admin');"))
    deleted_count = res.rowcount
    print(f'Deleted {deleted_count} users')
    
    # Re-enable FK checks
    conn.execute(text('SET FOREIGN_KEY_CHECKS=1;'))

print('Cleanup complete')
