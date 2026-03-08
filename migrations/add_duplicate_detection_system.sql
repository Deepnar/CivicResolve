-- CivicResolve Duplicate Detection System Migration
-- This migration adds support for duplicate issue detection and admin review
-- Run this migration after existing tables are created

USE `civicresolve_dev`;

-- ================================================================
-- STEP 1: Add duplicate detection fields to issues table
-- ================================================================

-- Add new columns to track duplicate information (check if they don't exist first)
SET @dbname = DATABASE();
SET @tablename = 'issues';

-- Add possible_duplicate_of column if it doesn't exist
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE (table_name = @tablename) AND (table_schema = @dbname)
   AND (column_name = 'possible_duplicate_of')) > 0,
  'SELECT 1',
  'ALTER TABLE issues ADD COLUMN possible_duplicate_of INT NULL AFTER reporter_id'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add duplicate_confidence column if it doesn't exist
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE (table_name = @tablename) AND (table_schema = @dbname)
   AND (column_name = 'duplicate_confidence')) > 0,
  'SELECT 1',
  'ALTER TABLE issues ADD COLUMN duplicate_confidence FLOAT NULL AFTER possible_duplicate_of'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add duplicate_status column if it doesn't exist
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE (table_name = @tablename) AND (table_schema = @dbname)
   AND (column_name = 'duplicate_status')) > 0,
  'SELECT 1',
  'ALTER TABLE issues ADD COLUMN duplicate_status ENUM(''PENDING'', ''MERGED'', ''IGNORED'', ''SEPARATE'') DEFAULT ''PENDING'' AFTER duplicate_confidence'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add reporter_confirmed_unique column if it doesn't exist
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE (table_name = @tablename) AND (table_schema = @dbname)
   AND (column_name = 'reporter_confirmed_unique')) > 0,
  'SELECT 1',
  'ALTER TABLE issues ADD COLUMN reporter_confirmed_unique BOOLEAN DEFAULT FALSE AFTER duplicate_status'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add reporter_acknowledgement column if it doesn't exist
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE (table_name = @tablename) AND (table_schema = @dbname)
   AND (column_name = 'reporter_acknowledgement')) > 0,
  'SELECT 1',
  'ALTER TABLE issues ADD COLUMN reporter_acknowledgement VARCHAR(50) NULL AFTER reporter_confirmed_unique'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add indexes if they don't exist
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
   WHERE (table_name = @tablename) AND (table_schema = @dbname)
   AND (index_name = 'idx_duplicate_status')) > 0,
  'SELECT 1',
  'ALTER TABLE issues ADD INDEX idx_duplicate_status (duplicate_status)'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
   WHERE (table_name = @tablename) AND (table_schema = @dbname)
   AND (index_name = 'idx_possible_duplicate')) > 0,
  'SELECT 1',
  'ALTER TABLE issues ADD INDEX idx_possible_duplicate (possible_duplicate_of)'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add foreign key constraint if it doesn't exist
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
   WHERE (table_name = @tablename) AND (table_schema = @dbname)
   AND (constraint_name = 'fk_possible_duplicate')) > 0,
  'SELECT 1',
  'ALTER TABLE issues ADD CONSTRAINT fk_possible_duplicate FOREIGN KEY (possible_duplicate_of) REFERENCES issues(id) ON DELETE SET NULL'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;
    
-- Add CLOSED_DUPLICATE status to existing status enum
ALTER TABLE issues 
  MODIFY COLUMN status ENUM('PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'UNDER_APPEAL', 'CLOSED_DUPLICATE') DEFAULT 'PENDING';

-- ================================================================
-- STEP 2: Create duplicate_relationships table
-- ================================================================

CREATE TABLE IF NOT EXISTS duplicate_relationships (
  id INT AUTO_INCREMENT PRIMARY KEY,
  original_issue_id INT NOT NULL,
  duplicate_issue_id INT NOT NULL,
  action ENUM('MERGED', 'IGNORED', 'SEPARATE') NOT NULL,
  admin_id INT NOT NULL,
  admin_comment TEXT NULL,
  similarity_score FLOAT NULL,
  distance_meters FLOAT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (original_issue_id) REFERENCES issues(id) ON DELETE CASCADE,
  FOREIGN KEY (duplicate_issue_id) REFERENCES issues(id) ON DELETE CASCADE,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE RESTRICT,
  
  INDEX idx_original_issue (original_issue_id),
  INDEX idx_duplicate_issue (duplicate_issue_id),
  INDEX idx_admin (admin_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at),
  
  -- Ensure one duplicate relationship per issue pair
  UNIQUE KEY unique_duplicate_pair (original_issue_id, duplicate_issue_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- STEP 3: Create duplicate detection audit log table
-- ================================================================

CREATE TABLE IF NOT EXISTS duplicate_detection_audit (
  id INT AUTO_INCREMENT PRIMARY KEY,
  issue_id INT NOT NULL,
  action_type ENUM('DETECTED', 'MERGED', 'IGNORED', 'SEPARATE', 'AUTO_DETECTED') NOT NULL,
  performed_by INT NULL,
  details JSON NULL,
  similarity_score FLOAT NULL,
  distance_meters FLOAT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
  FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL,
  
  INDEX idx_issue (issue_id),
  INDEX idx_action_type (action_type),
  INDEX idx_performed_by (performed_by),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- STEP 4: Create duplicate_ignore_pairs table
-- ================================================================
-- This table tracks issue pairs that should be ignored in future duplicate detection
-- When an admin marks two issues as "KEEP SEPARATE", future detection should skip them
-- Note: Always store issue_id_1 as the smaller ID and issue_id_2 as the larger ID

CREATE TABLE IF NOT EXISTS duplicate_ignore_pairs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  issue_id_1 INT NOT NULL COMMENT 'Smaller of the two issue IDs',
  issue_id_2 INT NOT NULL COMMENT 'Larger of the two issue IDs',
  added_by INT NOT NULL,
  reason TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (issue_id_1) REFERENCES issues(id) ON DELETE CASCADE,
  FOREIGN KEY (issue_id_2) REFERENCES issues(id) ON DELETE CASCADE,
  FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE RESTRICT,
  
  INDEX idx_issue_1 (issue_id_1),
  INDEX idx_issue_2 (issue_id_2),
  INDEX idx_added_by (added_by),
  
  -- Ensure both orderings of the pair are stored once
  -- Application must ensure issue_id_1 < issue_id_2
  UNIQUE KEY unique_ignore_pair (issue_id_1, issue_id_2),
  
  -- Add constraint to ensure issue_id_1 is always less than issue_id_2
  CONSTRAINT chk_issue_order CHECK (issue_id_1 < issue_id_2)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- STEP 5: Create duplicate_detection_config table
-- ================================================================
-- Store configurable thresholds and settings for duplicate detection

CREATE TABLE IF NOT EXISTS duplicate_detection_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  config_key VARCHAR(100) NOT NULL UNIQUE,
  config_value VARCHAR(500) NOT NULL,
  description TEXT NULL,
  updated_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
  
  INDEX idx_config_key (config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default configuration values (only if not already present)
INSERT IGNORE INTO duplicate_detection_config (config_key, config_value, description) VALUES
  ('similarity_threshold', '0.75', 'Minimum similarity score to flag as potential duplicate (0.0 - 1.0)'),
  ('distance_threshold_meters', '50', 'Maximum distance in meters to consider issues as potential duplicates'),
  ('enabled', 'true', 'Enable or disable duplicate detection system'),
  ('auto_merge_enabled', 'false', 'Enable automatic merging (NOT RECOMMENDED - admin review is safer)'),
  ('check_same_category_only', 'true', 'Only check for duplicates within same category'),
  ('title_weight', '0.4', 'Weight for title similarity in overall score (0.0 - 1.0)'),
  ('description_weight', '0.4', 'Weight for description similarity in overall score (0.0 - 1.0)'),
  ('location_weight', '0.2', 'Weight for location proximity in overall score (0.0 - 1.0)');

-- ================================================================
-- STEP 6: Optimize spatial queries with better indexing
-- ================================================================

-- Add spatial index for better geolocation performance (MySQL 5.7+)
-- This significantly improves performance of proximity searches

-- Add location_point column if it doesn't exist
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE (table_name = 'issues') AND (table_schema = DATABASE())
   AND (column_name = 'location_point')) > 0,
  'SELECT 1',
  'ALTER TABLE issues ADD COLUMN location_point POINT NULL AFTER longitude'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Populate the location_point column for existing issues
-- Temporarily disable safe update mode for this operation
SET SQL_SAFE_UPDATES = 0;

UPDATE issues 
SET location_point = POINT(longitude, latitude) 
WHERE location_point IS NULL AND id > 0;

-- Re-enable safe update mode
SET SQL_SAFE_UPDATES = 1;

-- Make location_point NOT NULL (required for spatial index)
-- Set a default location (Mumbai center) for any remaining NULL values
UPDATE issues 
SET location_point = POINT(72.8777, 19.0760)
WHERE location_point IS NULL AND id > 0;

-- Now make the column NOT NULL
ALTER TABLE issues 
MODIFY COLUMN location_point POINT NOT NULL;

-- Create spatial index if it doesn't exist
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
   WHERE (table_name = 'issues') AND (table_schema = DATABASE())
   AND (index_name = 'idx_location_point')) > 0,
  'SELECT 1',
  'CREATE SPATIAL INDEX idx_location_point ON issues(location_point)'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ================================================================
-- STEP 7: Create stored procedure for calculating Haversine distance
-- ================================================================

DELIMITER //

DROP PROCEDURE IF EXISTS CalculateDistance //

CREATE PROCEDURE CalculateDistance(
  IN lat1 DECIMAL(10, 8),
  IN lon1 DECIMAL(11, 8),
  IN lat2 DECIMAL(10, 8),
  IN lon2 DECIMAL(11, 8),
  OUT distance FLOAT
)
BEGIN
  -- Haversine formula to calculate distance in meters
  DECLARE earth_radius_km FLOAT DEFAULT 6371;
  DECLARE dlat FLOAT;
  DECLARE dlon FLOAT;
  DECLARE a FLOAT;
  DECLARE c FLOAT;
  
  SET dlat = RADIANS(lat2 - lat1);
  SET dlon = RADIANS(lon2 - lon1);
  SET a = SIN(dlat/2) * SIN(dlat/2) + 
          COS(RADIANS(lat1)) * COS(RADIANS(lat2)) * 
          SIN(dlon/2) * SIN(dlon/2);
  SET c = 2 * ATAN2(SQRT(a), SQRT(1-a));
  SET distance = earth_radius_km * c * 1000; -- Convert to meters
END //

DELIMITER ;

-- ================================================================
-- STEP 8: Create view for pending duplicate review queue
-- ================================================================

CREATE OR REPLACE VIEW admin_duplicate_review_queue AS
SELECT 
  i.id as issue_id,
  i.title as issue_title,
  i.category as issue_category,
  i.status as issue_status,
  i.latitude as issue_latitude,
  i.longitude as issue_longitude,
  i.address as issue_address,
  i.created_at as issue_created_at,
  i.reporter_id as issue_reporter_id,
  u1.name as issue_reporter_name,
  
  orig.id as original_issue_id,
  orig.title as original_title,
  orig.category as original_category,
  orig.status as original_status,
  orig.latitude as original_latitude,
  orig.longitude as original_longitude,
  orig.address as original_address,
  orig.created_at as original_created_at,
  orig.reporter_id as original_reporter_id,
  u2.name as original_reporter_name,
  
  i.duplicate_confidence as similarity_score,
  i.duplicate_status,
  
  -- Calculate distance using Haversine formula (approximate)
  (6371000 * ACOS(
    COS(RADIANS(i.latitude)) * 
    COS(RADIANS(orig.latitude)) * 
    COS(RADIANS(orig.longitude) - RADIANS(i.longitude)) + 
    SIN(RADIANS(i.latitude)) * 
    SIN(RADIANS(orig.latitude))
  )) as distance_meters,
  
  (SELECT COUNT(*) FROM votes WHERE issue_id = i.id) as issue_votes,
  (SELECT COUNT(*) FROM comments WHERE issue_id = i.id) as issue_comments,
  (SELECT COUNT(*) FROM votes WHERE issue_id = orig.id) as original_votes,
  (SELECT COUNT(*) FROM comments WHERE issue_id = orig.id) as original_comments
  
FROM issues i
INNER JOIN issues orig ON i.possible_duplicate_of = orig.id
LEFT JOIN users u1 ON i.reporter_id = u1.id
LEFT JOIN users u2 ON orig.reporter_id = u2.id
WHERE i.duplicate_status = 'PENDING'
  AND i.status != 'CLOSED_DUPLICATE'
  AND orig.status != 'CLOSED_DUPLICATE'
ORDER BY i.duplicate_confidence DESC, i.created_at ASC;

-- ================================================================
-- STEP 9: Create indexes for performance optimization
-- ================================================================

-- Composite index for duplicate detection queries
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
   WHERE (table_name = 'issues') AND (table_schema = DATABASE())
   AND (index_name = 'idx_duplicate_detection')) > 0,
  'SELECT 1',
  'ALTER TABLE issues ADD INDEX idx_duplicate_detection (category, status, duplicate_status, created_at)'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Index for checking if issue pairs should be ignored
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
   WHERE (table_name = 'duplicate_ignore_pairs') AND (table_schema = DATABASE())
   AND (index_name = 'idx_pair_check')) > 0,
  'SELECT 1',
  'ALTER TABLE duplicate_ignore_pairs ADD INDEX idx_pair_check (issue_id_1, issue_id_2)'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ================================================================
-- STEP 10: Create function to check if pair should be ignored
-- ================================================================

DELIMITER //

DROP FUNCTION IF EXISTS ShouldIgnorePair //

CREATE FUNCTION ShouldIgnorePair(
  id1 INT,
  id2 INT
) RETURNS BOOLEAN
DETERMINISTIC
READS SQL DATA
BEGIN
  DECLARE ignore_count INT;
  DECLARE min_id INT;
  DECLARE max_id INT;
  
  -- Normalize the pair order
  SET min_id = LEAST(id1, id2);
  SET max_id = GREATEST(id1, id2);
  
  SELECT COUNT(*) INTO ignore_count
  FROM duplicate_ignore_pairs
  WHERE issue_id_1 = min_id AND issue_id_2 = max_id;
  
  RETURN ignore_count > 0;
END //

DELIMITER ;

-- ================================================================
-- COMPLETED: Database migration for Duplicate Detection System
-- ================================================================

-- Summary of changes:
-- 1. Added duplicate tracking fields to issues table
-- 2. Created duplicate_relationships table for admin actions
-- 3. Created audit logging for duplicate detection activities
-- 4. Created ignore pairs table to prevent false positive alerts
-- 5. Created configuration table for adjustable thresholds
-- 6. Added spatial indexing for better geolocation performance
-- 7. Created stored procedures for distance calculations
-- 8. Created admin view for pending duplicate reviews
-- 9. Added performance optimization indexes
-- 10. Created helper functions for duplicate checking

-- Next steps:
-- 1. Implement duplicate detection algorithm in backend
-- 2. Create admin API endpoints for duplicate management
-- 3. Build admin dashboard UI for reviewing duplicates
-- 4. Add reporter confirmation dialog
-- 5. Implement Redis caching for performance
