"""
Database migration script to create token_expire_settings table
"""
from database.connection import Base, engine
from models.token_setting import TokenExpireSetting

def create_token_settings_table():
    """Create the token_expire_settings table if it doesn't exist"""
    try:
        TokenExpireSetting.__table__.create(engine, checkfirst=True)
        print("Token expire settings table created successfully!")
    except Exception as e:
        print(f"Error creating token expire settings table: {e}")

if __name__ == "__main__":
    create_token_settings_table()
