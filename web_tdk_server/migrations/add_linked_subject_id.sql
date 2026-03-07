-- Migration: Add linked_subject_id to subjects table
-- Purpose: Link semester-copy subjects together so they're treated as "the same subject" when combining semesters
-- Run once against production database (MySQL 5.7+)

ALTER TABLE subjects
    ADD COLUMN linked_subject_id INT NULL COMMENT 'ID of the source subject this was copied from (for cross-semester linking)';

CREATE INDEX idx_subjects_linked_subject_id ON subjects (linked_subject_id);
