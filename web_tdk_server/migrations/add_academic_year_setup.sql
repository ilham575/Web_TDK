-- Migration: Add academic year setup enforcement columns to schools table
-- This must be run BEFORE deploying the new code that enforces academic year setup

ALTER TABLE schools ADD COLUMN is_academic_year_setup BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE schools ADD COLUMN current_academic_year VARCHAR(10) NULL;
ALTER TABLE schools ADD COLUMN current_semester INT NULL;

-- For existing schools that already have semester_periods, mark them as setup done
UPDATE schools s
SET is_academic_year_setup = TRUE,
    current_academic_year = (
        SELECT sp.academic_year FROM semester_periods sp 
        WHERE sp.school_id = s.id 
        ORDER BY sp.academic_year DESC, sp.semester DESC 
        LIMIT 1
    ),
    current_semester = (
        SELECT sp.semester FROM semester_periods sp 
        WHERE sp.school_id = s.id 
        ORDER BY sp.academic_year DESC, sp.semester DESC 
        LIMIT 1
    )
WHERE EXISTS (
    SELECT 1 FROM semester_periods sp WHERE sp.school_id = s.id
);
