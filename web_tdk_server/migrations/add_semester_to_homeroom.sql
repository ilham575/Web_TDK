-- Migration: Add semester column to homeroom_teachers
-- Description: Make homeroom assignments unique and queryable per academic year and semester

ALTER TABLE homeroom_teachers
ADD COLUMN semester INTEGER NULL AFTER academic_year;

-- Backfill semester from linked classroom when available
UPDATE homeroom_teachers hr
JOIN classrooms c ON c.id = hr.classroom_id
SET hr.semester = c.semester
WHERE hr.classroom_id IS NOT NULL
  AND hr.semester IS NULL;

-- Drop legacy unique indexes that still enforce one homeroom per teacher/classroom per year only.
SET @drop_teacher_idx = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'homeroom_teachers'
        AND index_name = 'uq_homeroom_teacher_school_year'
    ),
    'ALTER TABLE homeroom_teachers DROP INDEX uq_homeroom_teacher_school_year',
    'SELECT 1'
  )
);
PREPARE stmt FROM @drop_teacher_idx;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @drop_classroom_idx = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'homeroom_teachers'
        AND index_name = 'uq_homeroom_classroom_year'
    ),
    'ALTER TABLE homeroom_teachers DROP INDEX uq_homeroom_classroom_year',
    'SELECT 1'
  )
);
PREPARE stmt FROM @drop_classroom_idx;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Create semester-aware unique indexes.
SET @create_teacher_idx = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'homeroom_teachers'
        AND index_name = 'uq_homeroom_teacher_school_year_semester'
    ),
    'SELECT 1',
    'CREATE UNIQUE INDEX uq_homeroom_teacher_school_year_semester ON homeroom_teachers (teacher_id, school_id, academic_year, semester)'
  )
);
PREPARE stmt FROM @create_teacher_idx;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @create_classroom_idx = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'homeroom_teachers'
        AND index_name = 'uq_homeroom_classroom_year_semester'
    ),
    'SELECT 1',
    'CREATE UNIQUE INDEX uq_homeroom_classroom_year_semester ON homeroom_teachers (classroom_id, academic_year, semester)'
  )
);
PREPARE stmt FROM @create_classroom_idx;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;