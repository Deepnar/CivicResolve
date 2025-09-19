-- Simple NGO Support Migration
-- This migration extends CivicResolve to support NGOs as intermediaries for citizens without phones
-- NGOs are managed by system admins and get priority email notifications

USE `civicresolve_dev`;

-- Step 1: Extend user roles to include NGO_ADMIN
ALTER TABLE users MODIFY COLUMN role ENUM('CITIZEN', 'ADMIN', 'ORGANIZATION_ADMIN', 'NGO_ADMIN') DEFAULT 'CITIZEN';

-- Step 2: Ensure NGO table exists with basic structure (may already exist)
CREATE TABLE IF NOT EXISTS ngos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  registration_number VARCHAR(100),
  contact_person VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_active (is_active)
);

-- Step 3: User-NGO relationships (simple structure)
CREATE TABLE IF NOT EXISTS user_ngos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  ngo_id INT NOT NULL,
  role ENUM('NGO_ADMIN', 'MEMBER') DEFAULT 'MEMBER',
  position VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assigned_by INT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (ngo_id) REFERENCES ngos(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY unique_user_ngo (user_id, ngo_id),
  INDEX idx_user (user_id),
  INDEX idx_ngo (ngo_id),
  INDEX idx_role (role),
  INDEX idx_active (is_active)
);

-- Step 4: Insert sample NGOs (simple structure)
INSERT IGNORE INTO ngos (name, description, email, phone, contact_person, registration_number) VALUES 
('Citizens Help Foundation', 'NGO focused on helping citizens access government services and report civic issues', 'admin@citizenshelp.org', '+91-22-28901234', 'Rajesh Kumar', 'NGO/REG/2023/001'),
('Community Welfare Society', 'Working for community development and civic infrastructure improvement', 'contact@communitywelfare.org', '+91-22-28902345', 'Priya Sharma', 'NGO/REG/2023/002'),
('Urban Development Support NGO', 'Supporting urban development and helping citizens report infrastructure issues', 'info@urbandev.org', '+91-22-28903456', 'Amit Patel', 'NGO/REG/2023/003');

-- Step 5: Insert sample NGO admin users (password: ngo123 for all)
INSERT IGNORE INTO users (email, name, password, role) VALUES 
('rajesh@citizenshelp.org', 'Rajesh Kumar - CHF Admin', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj2k0RVN8Auu', 'NGO_ADMIN'),
('priya@communitywelfare.org', 'Priya Sharma - CWS Admin', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj2k0RVN8Auu', 'NGO_ADMIN'),
('amit@urbandev.org', 'Amit Patel - UDS Admin', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj2k0RVN8Auu', 'NGO_ADMIN');

-- Step 6: Assign NGO admins to their respective NGOs
INSERT IGNORE INTO user_ngos (user_id, ngo_id, role, position, assigned_by)
SELECT u.id, 1, 'NGO_ADMIN', 'Executive Director', 1 
FROM users u 
WHERE u.email = 'rajesh@citizenshelp.org';

INSERT IGNORE INTO user_ngos (user_id, ngo_id, role, position, assigned_by)
SELECT u.id, 2, 'NGO_ADMIN', 'Executive Director', 1 
FROM users u 
WHERE u.email = 'priya@communitywelfare.org';

INSERT IGNORE INTO user_ngos (user_id, ngo_id, role, position, assigned_by)
SELECT u.id, 3, 'NGO_ADMIN', 'Executive Director', 1 
FROM users u 
WHERE u.email = 'amit@urbandev.org';

-- Step 7: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Step 8: Add comments for documentation
ALTER TABLE ngos COMMENT = 'NGO organizations that can report issues on behalf of citizens. Managed by system admins.';
ALTER TABLE user_ngos COMMENT = 'Relationship table linking users to NGOs with specific roles';

COMMIT;
