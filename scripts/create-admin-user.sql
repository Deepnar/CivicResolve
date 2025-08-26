-- Create an admin user for testing
-- Run this in your MySQL database

USE civicresolve;

-- Check if there are any admin users
SELECT * FROM users WHERE role = 'ADMIN';

-- If no admin users exist, create one
-- (You can uncomment and modify the INSERT statement below)
-- 
-- INSERT INTO users (email, name, password, role, points) 
-- VALUES ('admin@example.com', 'Admin User', 'hashed_password_here', 'ADMIN', 0);

-- To create an admin user with a simple password, you can use:
-- The password 'admin123' hashed would be something like this (but use proper bcrypt in production)
-- For testing purposes, here's a simple hash:
-- INSERT INTO users (email, name, password, role, points) 
-- VALUES ('admin@example.com', 'Admin User', 'admin123', 'ADMIN', 0);
