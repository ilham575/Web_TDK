-- Migration: Add PDF attachment columns to announcements table
-- Run once on existing databases

ALTER TABLE announcements ADD COLUMN IF NOT EXISTS pdf_file_path VARCHAR(500) NULL;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS pdf_file_name VARCHAR(255) NULL;
