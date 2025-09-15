-- Migration to add assignment columns to issues table
-- This allows issues to be assigned to specific organization members

USE `civicresolve_dev`;

-- Add assignment columns to issues table
ALTER TABLE issues 
ADD COLUMN assigned_to INT NULL COMMENT 'User ID of the organization member assigned to this issue',
ADD COLUMN assigned_to_name VARCHAR(255) NULL COMMENT 'Name of the organization member assigned to this issue',
ADD COLUMN assigned_at TIMESTAMP NULL COMMENT 'When the issue was assigned',
ADD COLUMN assigned_by INT NULL COMMENT 'User ID who made the assignment';

-- Add foreign key constraints
ALTER TABLE issues 
ADD CONSTRAINT fk_issues_assigned_to FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_issues_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL;

-- Add indexes for performance
CREATE INDEX idx_issues_assigned_to ON issues(assigned_to);
CREATE INDEX idx_issues_assigned_at ON issues(assigned_at);
