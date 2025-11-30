-- Migration: Add grade_level column to users table
-- Description: Add grade_level field to store student's grade/class level

ALTER TABLE users ADD COLUMN grade_level VARCHAR(50) NULL AFTER school_id;

-- Index on grade_level for better query performance (optional)
CREATE INDEX idx_users_grade_level ON users(grade_level);
