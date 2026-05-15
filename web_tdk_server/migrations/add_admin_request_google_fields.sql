-- Migration: add Google signup/link metadata to admin_requests
-- Run this once on databases that already have the admin_requests table.

ALTER TABLE admin_requests ADD COLUMN IF NOT EXISTS social_provider VARCHAR(32) NULL;
ALTER TABLE admin_requests ADD COLUMN IF NOT EXISTS social_provider_user_id VARCHAR(255) NULL;
ALTER TABLE admin_requests ADD COLUMN IF NOT EXISTS social_provider_email VARCHAR(255) NULL;
ALTER TABLE admin_requests ADD COLUMN IF NOT EXISTS social_email_verified BOOLEAN NOT NULL DEFAULT FALSE;