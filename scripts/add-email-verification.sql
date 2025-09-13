-- Email Verification Migration
-- Add email verification fields to users table

ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN verification_token VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN verification_token_expires TIMESTAMP NULL;

-- Add index for verification token lookup
ALTER TABLE users ADD INDEX idx_verification_token (verification_token);
