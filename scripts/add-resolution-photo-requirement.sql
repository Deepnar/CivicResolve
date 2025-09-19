-- Add resolution photo requirement for issue completion
-- This migration adds a resolution_image_url field to track proof of issue resolution

USE `civicresolve_dev`;

-- Add resolution image URL field to issues table
ALTER TABLE issues 
ADD COLUMN resolution_image_url TEXT NULL 
AFTER image_url;

-- Add index for better query performance
CREATE INDEX idx_issues_resolution_image ON issues(resolution_image_url(255));

-- Add comment for documentation
ALTER TABLE issues COMMENT = 'Issues reported by citizens. Now requires resolution photo for completion.';

-- Update any existing RESOLVED issues to have a placeholder note
-- (Optional: You can run this to mark existing resolved issues)
-- UPDATE issues 
-- SET resolution_image_url = 'legacy-resolved' 
-- WHERE status = 'RESOLVED' AND resolution_image_url IS NULL;

SELECT 'Migration completed: Added resolution_image_url field to issues table' AS status;