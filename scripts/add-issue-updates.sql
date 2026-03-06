-- Migration to add issue_updates table
-- This allows assigned workers to post progress updates on issues

USE `civicresolve_dev`;

-- Create issue_updates table
CREATE TABLE IF NOT EXISTS issue_updates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  issue_id INT NOT NULL,
  user_id INT NOT NULL,
  message TEXT NOT NULL,
  image_url LONGTEXT NULL COMMENT 'Base64 encoded image data',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_issue_updates_issue_id (issue_id),
  INDEX idx_issue_updates_user_id (user_id),
  INDEX idx_issue_updates_created_at (created_at)
) COMMENT='Stores progress updates posted by assigned workers on issues';
