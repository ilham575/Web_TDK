import os
import sys
from pathlib import Path

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

try:
    from database.connection import SessionLocal
    from models.user import User
    from utils.security import hash_password, verify_password
except ImportError as e:
    print(f"Error importing modules: {e}")
    print("Make sure you have run: pip install -r requirements.txt")
    sys.exit(1)

def create_owner():
    """Create a default owner user"""
    try:
        db = SessionLocal()
        print("Connected to database successfully!")
    except Exception as e:
        print(f"Error connecting to database: {e}")
        print("Make sure DATABASE_URL environment variable is set correctly")
        print("Example: mysql+pymysql://admin_tdk:password@/tadika_db?unix_socket=/cloudsql/PROJECT:REGION:INSTANCE")
        return False
    
    try:
        # Check if owner already exists
        existing = db.query(User).filter(User.username == "owner").first()
        if existing:
            print("✓ Owner user already exists")
            print(f"  Username: {existing.username}")
            print(f"  Role: {existing.role}")
            # If existing user still uses the default password, ensure they must change it on first login
            try:
                if verify_password("owner123", existing.hashed_password) and not existing.must_change_password:
                    existing.must_change_password = True
                    db.commit()
                    print("  🛡️  Owner account uses default password — marked as must_change_password")
            except Exception:
                pass
            return True
        
        # Create owner user
        hashed = hash_password("owner123")
        owner = User(
            username="owner",
            email="owner@example.com",
            full_name="System Owner",
            hashed_password=hashed,
            role="owner"
            ,
            must_change_password=True
        )
        db.add(owner)
        db.commit()
        print("✓ Owner user created successfully!")
        print(f"  Username: owner")
        print(f"  Password: owner123")
        print(f"  Role: owner")
        print("\n⚠️  IMPORTANT: The owner account must change this temporary password on first login.")
        return True
    except Exception as e:
        print(f"✗ Error creating owner: {e}")
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    print("=" * 50)
    print("Creating Owner User")
    print("=" * 50)
    success = create_owner()
    sys.exit(0 if success else 1)