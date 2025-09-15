-- CivicResolve Organization Management Schema Extensions
-- Add these to your existing database after running the main schema

-- Organizations table
CREATE TABLE organizations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_active (is_active)
);

-- User-Organization relationships with roles
CREATE TABLE user_organizations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  organization_id INT NOT NULL,
  role ENUM('ORGANIZATION_ADMIN', 'MEMBER') DEFAULT 'MEMBER',
  employee_id VARCHAR(100),
  position VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assigned_by INT, -- User ID who assigned this relationship
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY unique_user_org (user_id, organization_id),
  INDEX idx_user (user_id),
  INDEX idx_organization (organization_id),
  INDEX idx_role (role),
  INDEX idx_active (is_active)
);

-- Category-Organization mappings
CREATE TABLE category_organization_mappings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category VARCHAR(100) NOT NULL,
  organization_id INT NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE, -- One primary organization per category
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  UNIQUE KEY unique_category_org (category, organization_id),
  INDEX idx_category (category),
  INDEX idx_organization (organization_id),
  INDEX idx_primary (is_primary)
);

-- Issue assignments to organizations (tracking table)
CREATE TABLE issue_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  issue_id INT NOT NULL,
  organization_id INT NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assigned_by INT, -- User ID who made the assignment
  FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY unique_issue_org (issue_id, organization_id),
  INDEX idx_issue (issue_id),
  INDEX idx_organization (organization_id)
);

-- Update users table to support new role types
ALTER TABLE users MODIFY COLUMN role ENUM('CITIZEN', 'ADMIN', 'ORGANIZATION_ADMIN') DEFAULT 'CITIZEN';

-- Insert sample organizations
INSERT INTO organizations (name, description, email, phone) VALUES 
('MBMC (Mira-Bhayandar Municipal Corporation)', 'Municipal corporation responsible for civic amenities and infrastructure', 'admin@mbmc.gov.in', '+91-22-28123456'),
('Water Board', 'Water supply and distribution management', 'info@waterboard.gov.in', '+91-22-28234567'),
('Electricity Board', 'Power distribution and electrical infrastructure', 'support@electricityboard.gov.in', '+91-22-28345678'),
('Public Works Department', 'Roads, bridges, and public infrastructure maintenance', 'contact@pwd.gov.in', '+91-22-28456789'),
('Waste Management Corporation', 'Solid waste collection, processing and disposal', 'info@wmcorp.gov.in', '+91-22-28567890');

-- Insert category-organization mappings
INSERT INTO category_organization_mappings (category, organization_id, is_primary) VALUES 
('ROADS', 4, TRUE), -- Public Works Department for Roads
('LIGHTING', 3, TRUE), -- Electricity Board for Street Lighting
('SANITATION', 5, TRUE), -- Waste Management Corporation for Sanitation
('PARKS', 1, TRUE), -- MBMC for Parks & Recreation
('UTILITIES', 2, TRUE), -- Water Board for Utilities (primary)
('UTILITIES', 3, FALSE), -- Electricity Board for Utilities (secondary)
('SAFETY', 1, TRUE), -- MBMC for Public Safety
('OTHER', 1, TRUE); -- MBMC for Other Issues

-- Insert sample organization admin users (password: admin123 for all)
INSERT INTO users (email, name, password, role) VALUES 
('mbmc.admin@civicresolve.com', 'MBMC Administrator', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj2k0RVN8Auu', 'ORGANIZATION_ADMIN'),
('water.admin@civicresolve.com', 'Water Board Administrator', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj2k0RVN8Auu', 'ORGANIZATION_ADMIN'),
('electricity.admin@civicresolve.com', 'Electricity Board Administrator', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj2k0RVN8Auu', 'ORGANIZATION_ADMIN'),
('pwd.admin@civicresolve.com', 'PWD Administrator', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj2k0RVN8Auu', 'ORGANIZATION_ADMIN'),
('waste.admin@civicresolve.com', 'Waste Management Administrator', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj2k0RVN8Auu', 'ORGANIZATION_ADMIN');

-- Assign organization admins to their respective organizations
-- Note: We need to get the user IDs first, so we'll use a subquery approach
INSERT INTO user_organizations (user_id, organization_id, role, position, assigned_by)
SELECT u.id, 1, 'ORGANIZATION_ADMIN', 'Chief Administrator', 1 
FROM users u 
WHERE u.email = 'mbmc.admin@civicresolve.com';

INSERT INTO user_organizations (user_id, organization_id, role, position, assigned_by)
SELECT u.id, 2, 'ORGANIZATION_ADMIN', 'Chief Administrator', 1 
FROM users u 
WHERE u.email = 'water.admin@civicresolve.com';

INSERT INTO user_organizations (user_id, organization_id, role, position, assigned_by)
SELECT u.id, 3, 'ORGANIZATION_ADMIN', 'Chief Administrator', 1 
FROM users u 
WHERE u.email = 'electricity.admin@civicresolve.com';

INSERT INTO user_organizations (user_id, organization_id, role, position, assigned_by)
SELECT u.id, 4, 'ORGANIZATION_ADMIN', 'Chief Administrator', 1 
FROM users u 
WHERE u.email = 'pwd.admin@civicresolve.com';

INSERT INTO user_organizations (user_id, organization_id, role, position, assigned_by)
SELECT u.id, 5, 'ORGANIZATION_ADMIN', 'Chief Administrator', 1 
FROM users u 
WHERE u.email = 'waste.admin@civicresolve.com';

-- Create indexes for performance
CREATE INDEX idx_issues_category ON issues(category);
CREATE INDEX idx_issues_status_category ON issues(status, category);
