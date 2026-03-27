-- Migration: add user_status column to users table
-- Values: 'active', 'inactive', 'graduated', 'resigned'
-- Run this once on your database.

ALTER TABLE users ADD COLUMN IF NOT EXISTS user_status VARCHAR(20) NOT NULL DEFAULT 'active';

-- Sync existing inactive users
UPDATE users SET user_status = 'inactive' WHERE is_active = 0 AND user_status = 'active';
