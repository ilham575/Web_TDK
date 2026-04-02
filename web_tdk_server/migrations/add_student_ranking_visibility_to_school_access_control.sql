-- Migration: add per-semester student ranking visibility to school_access_control

ALTER TABLE school_access_control
ADD COLUMN allow_student_view_ranking BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Can students view ranking results' AFTER allow_student_view_grades;

UPDATE school_access_control
SET allow_student_view_ranking = allow_student_view_grades;