-- Add appeal system to CivicResolve database
-- This script creates the appeals table and updates the issues table status enum

-- 1. Create the appeals table
CREATE TABLE IF NOT EXISTS appeals (
    id INT PRIMARY KEY AUTO_INCREMENT,
    issue_id INT NOT NULL,
    reporter_id INT NOT NULL,
    reason TEXT NOT NULL,
    status ENUM('PENDING', 'UNDER_REVIEW', 'ACCEPTED', 'DENIED') DEFAULT 'PENDING',
    reviewer_id INT NULL,
    reviewer_comment TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_appeals_issue_id (issue_id),
    INDEX idx_appeals_reporter_id (reporter_id),
    INDEX idx_appeals_status (status),
    INDEX idx_appeals_created_at (created_at)
);

-- 2. Update the issues table to add UNDER_APPEAL status
ALTER TABLE issues MODIFY COLUMN status ENUM('PENDING','IN_PROGRESS','RESOLVED','REJECTED', 'UNDER_APPEAL') DEFAULT 'PENDING';

-- 3. Add index for better performance on status queries
CREATE INDEX IF NOT EXISTS idx_issues_status_updated ON issues(status, updated_at);

-- Verify the changes
DESCRIBE appeals;
SHOW CREATE TABLE issues;