-- Add anonymous reporting feature
-- Migration: add_anonymous_reporting.sql

USE `civicresolve_dev`;

-- Add is_anonymous column to issues table
ALTER TABLE issues 
ADD COLUMN is_anonymous BOOLEAN DEFAULT FALSE AFTER reporter_id,
ADD INDEX idx_is_anonymous (is_anonymous);

-- Create audit log table for tracking anonymous submissions
CREATE TABLE IF NOT EXISTS anonymous_submissions_audit (
  id INT AUTO_INCREMENT PRIMARY KEY,
  issue_id INT NOT NULL,
  reporter_id INT NOT NULL,
  ip_address_hash VARCHAR(64) NULL,
  user_agent_hash VARCHAR(64) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
  FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_reporter (reporter_id),
  INDEX idx_issue (issue_id),
  INDEX idx_created_at (created_at)
);

-- Note: reporter_id is still stored in issues table for:
-- 1. Internal logging and audit trails
-- 2. Abuse prevention and rate limiting
-- 3. Moderation and security
-- 4. Analytics and statistics
-- When is_anonymous = TRUE, the reporter name will be masked in the application layer
