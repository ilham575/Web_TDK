-- Migration: Add school-wide break flag to schedule slots
-- Purpose: Allow admins to mark a schedule slot as a break that applies to all classrooms

ALTER TABLE schedule_slots
ADD COLUMN is_break BOOLEAN NOT NULL DEFAULT 0;