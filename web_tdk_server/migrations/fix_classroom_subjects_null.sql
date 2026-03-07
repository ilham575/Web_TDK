-- Migration: Fix null classroom_id in classroom_subjects
-- This migration handles the case where old classroom_subjects records have NULL classroom_id
-- since the column is now NOT NULL, we delete these invalid records

-- Delete any classroom_subjects records with NULL classroom_id (invalid data)
DELETE FROM classroom_subjects WHERE classroom_id IS NULL;

-- Ensure the column is NOT NULL (if not already)
-- For MySQL: ALTER TABLE classroom_subjects MODIFY classroom_id INTEGER NOT NULL;
-- For SQLite: Already set during table creation
