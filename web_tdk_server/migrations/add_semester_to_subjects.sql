-- Migration: Add academic_year and semester columns to subjects table
-- Run this once against the production database

ALTER TABLE subjects
    ADD COLUMN IF NOT EXISTS academic_year VARCHAR(10) NULL COMMENT 'ปีการศึกษา เช่น 2567',
    ADD COLUMN IF NOT EXISTS semester INT NULL COMMENT 'เทอม 1 หรือ 2';

-- Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_subjects_academic_year_semester
    ON subjects (school_id, academic_year, semester);
