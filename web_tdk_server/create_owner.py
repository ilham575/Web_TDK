from database.connection import SessionLocal
from models.user import User
from utils.security import hash_password

def create_owner():
    db = SessionLocal()
    try:
        # Check if owner already exists
        existing = db.query(User).filter(User.username == "owner").first()
        if existing:
            print("Owner user already exists")
            return
        
        # Create owner user
        hashed = hash_password("owner123")
        owner = User(
            username="owner",
            email="owner@example.com",
            full_name="System Owner",
            hashed_password=hashed,
            role="owner"
        )
        db.add(owner)
        db.commit()
        print("Owner user created successfully")
        print("Username: owner")
        print("Password: owner123")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_owner()