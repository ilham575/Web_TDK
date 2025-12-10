-- Migration: Add approval tracking fields to absences table
-- Date: 2025-12-03
-- Description: Add fields to track who approved/rejected an absence request
--              and add version field for optimistic locking to prevent race conditions

-- Add approval tracking columns
ALTER TABLE absences
    ADD COLUMN approved_by INT NULL COMMENT 'User ID ของผู้อนุมัติ/ปฏิเสธ',
    ADD COLUMN approved_at DATETIME NULL COMMENT 'เวลาที่อนุมัติ/ปฏิเสธ',
    ADD COLUMN approver_role VARCHAR(20) NULL COMMENT 'บทบาทผู้อนุมัติ: admin หรือ teacher',
    ADD COLUMN reject_reason TEXT NULL COMMENT 'เหตุผลการปฏิเสธ',
    ADD COLUMN version INT NOT NULL DEFAULT 1 COMMENT 'Version สำหรับ optimistic locking';

-- Add foreign key constraint for approved_by
ALTER TABLE absences
    ADD CONSTRAINT fk_absences_approved_by 
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;

-- Add index for approved_by for faster lookups
CREATE INDEX idx_absences_approved_by ON absences(approved_by);

-- Add index for version (useful for queries filtering by version)
CREATE INDEX idx_absences_version ON absences(version);
