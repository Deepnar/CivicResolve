-- Fix image_url column to handle large base64 images
-- Run this SQL command in your MySQL database

USE civicresolve;

-- Update the image_url column to LONGTEXT to handle base64 images
ALTER TABLE issues MODIFY COLUMN image_url LONGTEXT NULL;

-- Verify the change
DESCRIBE issues;
