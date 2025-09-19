-- Fix resolution_image_url column to support longer URLs and file paths
-- This migration changes the column from TEXT to VARCHAR(500) which is sufficient for file paths

USE `civicresolve_dev`;

-- Modify the resolution_image_url column to support base64 image data
ALTER TABLE issues 
MODIFY COLUMN resolution_image_url LONGTEXT NULL;

-- Update the index since we changed the column type
DROP INDEX idx_issues_resolution_image;
CREATE INDEX idx_issues_resolution_image ON issues(resolution_image_url);