-- Migration: Remove classroom unique constraint from homeroom_teachers table
-- Purpose: Allow multiple homeroom teachers per classroom
--          (One teacher = one classroom, but one classroom = multiple teachers allowed)
--
-- This allows:
-- - Teacher A -> Classroom 6
-- - Teacher B -> Classroom 6  (now allowed)
-- While preventing:
-- - Teacher A -> Classroom 6
-- - Teacher A -> Classroom 5 (still prevented by uq_homeroom_teacher_school_year_semester)

-- SQLite
ALTER TABLE homeroom_teachers DROP CONSTRAINT IF EXISTS uq_homeroom_classroom_year_semester;

-- PostgreSQL (if applicable)
-- ALTER TABLE homeroom_teachers DROP CONSTRAINT IF EXISTS uq_homeroom_classroom_year_semester;

-- MySQL (if applicable)
-- ALTER TABLE homeroom_teachers DROP INDEX IF EXISTS uq_homeroom_classroom_year_semester;
