-- Migration: Add indexes to classroom_id in subject_schedules table
-- Purpose: Optimize queries for classroom-specific schedules
-- Date: 2025-12-04

-- Add index for better query performance when filtering by classroom and subject
CREATE INDEX idx_subject_schedule_classroom ON subject_schedules(classroom_id, subject_id);

-- Add index for subject + classroom + day_of_week
CREATE INDEX idx_subject_schedule_day ON subject_schedules(subject_id, classroom_id, day_of_week);



