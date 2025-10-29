from database.connection import engine, Base
from models import user, school, announcement, document

if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    print("Tables created (if not exists).")
