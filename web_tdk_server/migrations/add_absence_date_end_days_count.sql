-- Migration: Add absence_date_end to absences table (days_count already exists)
-- Date: 2025-12-04

ALTER TABLE absences
ADD COLUMN absence_date_end DATE NULL AFTER absence_date;

-- Add indexes for better query performance
CREATE INDEX idx_absence_date_range ON absences(absence_date, absence_date_end);
