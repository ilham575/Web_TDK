"""
Script to create tables in Cloud SQL through Cloud Functions deployment
This will be run once to initialize the database schema
"""
import os
from database.connection import engine, Base
from models import user, school, announcement, document, subject, subject_student, attendance, grade, schedule, admin_request, evaluation, absence, homeroom, classroom, classroom_subject, password_reset_request, school_deletion_request, token_setting

def create_tables():
    """Create all tables in the database"""
    print("Creating tables...")
    try:
        Base.metadata.create_all(bind=engine)
        print("✓ All tables created successfully!")
    except Exception as e:
        print(f"✗ Error creating tables: {e}")
        raise

if __name__ == "__main__":
    # Run this directly to create tables
    create_tables()
