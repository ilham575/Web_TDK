from sqlalchemy import inspect, text
from database.connection import engine, Base

def add_columns():
    inspector = inspect(engine)
    cols = [c['name'] for c in inspector.get_columns('subjects')]
    
    with engine.connect() as conn:
        if 'max_collected_score' not in cols:
            print("Adding max_collected_score to subjects...")
            conn.execute(text("ALTER TABLE subjects ADD COLUMN max_collected_score INTEGER DEFAULT 100"))
            conn.commit()
        
        if 'max_exam_score' not in cols:
            print("Adding max_exam_score to subjects...")
            conn.execute(text("ALTER TABLE subjects ADD COLUMN max_exam_score INTEGER DEFAULT 100"))
            conn.commit()
    print("Done checking columns.")

if __name__ == "__main__":
    add_columns()