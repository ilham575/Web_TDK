-- Migration: add credits and activity_percentage to subjects
ALTER TABLE subjects ADD COLUMN credits INTEGER;
ALTER TABLE subjects ADD COLUMN activity_percentage INTEGER;
