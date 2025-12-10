-- Migration: Add subject_type and classroom_subjects table
-- This migration adds support for subject types (main/activity) and classroom-subject relationships

-- Add subject_type column to subjects table (if not exists)
ALTER TABLE subjects ADD COLUMN subject_type VARCHAR(50) DEFAULT 'main' NOT NULL;

-- Create classroom_subjects table for many-to-many relationship
CREATE TABLE IF NOT EXISTS classroom_subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    classroom_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (classroom_id) REFERENCES classrooms(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    UNIQUE (classroom_id, subject_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_classroom_subjects_classroom_id ON classroom_subjects(classroom_id);
CREATE INDEX IF NOT EXISTS idx_classroom_subjects_subject_id ON classroom_subjects(subject_id);
