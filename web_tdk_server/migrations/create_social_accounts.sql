-- Migration: create social_accounts table for Google link-first sign-in
-- Stores one linked Google account per user and one system user per Google identity.

CREATE TABLE IF NOT EXISTS social_accounts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    provider VARCHAR(32) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    provider_email VARCHAR(255) NULL,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_social_accounts_provider_user (provider, provider_user_id),
    UNIQUE KEY uq_social_accounts_user_provider (user_id, provider),
    INDEX idx_social_accounts_user_id (user_id),
    INDEX idx_social_accounts_provider (provider),
    INDEX idx_social_accounts_provider_user_id (provider_user_id),
    CONSTRAINT fk_social_accounts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);