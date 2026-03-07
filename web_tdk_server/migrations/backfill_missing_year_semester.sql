-- Migration: Fill missing academic_year and semester for legacy subjects
-- Run once to backfill NULL values in existing subjects

-- Count how many subjects need fixing
SELECT COUNT(*) as subjects_needing_fix FROM subjects WHERE academic_year IS NULL OR semester IS NULL;

-- Fill missing academic_year with current year (2567)
UPDATE subjects 
SET academic_year = '2567'
WHERE academic_year IS NULL;

-- Fill missing semester with 1 (default to semester 1)
UPDATE subjects 
SET semester = 1
WHERE semester IS NULL;

-- Verify the fix
SELECT COUNT(*) as subjects_with_data FROM subjects WHERE academic_year IS NOT NULL AND semester IS NOT NULL;
