-- Migration: Add classroom_id column to homeroom_teachers
-- Description: allow homeroom assignments to reference a specific classroom (per academic year)

ALTER TABLE homeroom_teachers ADD COLUMN classroom_id INTEGER NULL;

-- Optional: add FK constraint if DB supports it
-- ALTER TABLE homeroom_teachers ADD CONSTRAINT fk_homeroom_classroom FOREIGN KEY (classroom_id) REFERENCES classrooms(id);

-- Ensure a classroom is assigned at most once per academic year
CREATE UNIQUE INDEX uq_homeroom_classroom_year ON homeroom_teachers (classroom_id, academic_year);
