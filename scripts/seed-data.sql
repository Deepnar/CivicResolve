-- Seed data for CivicResolve
-- Run this after the database is initialized

-- Insert sample admin user (password: admin123)
INSERT INTO users (id, email, password, name, role, points, badges, createdAt, updatedAt) VALUES
('admin-001', 'admin@civicresolve.com', '$2a$12$LQv3c1yqBw2LeOI.UH.vYOUb.xRuuuiU.f9OvYwjTvXq7flhvQqHu', 'System Administrator', 'ADMIN', 0, '[]', NOW(), NOW());

-- Insert sample citizen users
INSERT INTO users (id, email, password, name, role, points, badges, createdAt, updatedAt) VALUES
('user-001', 'john.doe@email.com', '$2a$12$LQv3c1yqBw2LeOI.UH.vYOUb.xRuuuiU.f9OvYwjTvXq7flhvQqHu', 'John Doe', 'CITIZEN', 150, '["FIRST_REPORT", "COMMUNITY_HELPER"]', NOW(), NOW()),
('user-002', 'jane.smith@email.com', '$2a$12$LQv3c1yqBw2LeOI.UH.vYOUb.xRuuuiU.f9OvYwjTvXq7flhvQqHu', 'Jane Smith', 'CITIZEN', 75, '["FIRST_REPORT"]', NOW(), NOW()),
('user-003', 'mike.wilson@email.com', '$2a$12$LQv3c1yqBw2LeOI.UH.vYOUb.xRuuuiU.f9OvYwjTvXq7flhvQqHu', 'Mike Wilson', 'CITIZEN', 200, '["FIRST_REPORT", "COMMUNITY_HELPER", "ENGAGEMENT_STAR"]', NOW(), NOW());

-- Insert sample issues
INSERT INTO issues (id, title, description, category, status, priority, latitude, longitude, address, imageUrl, reporterId, createdAt, updatedAt) VALUES
('issue-001', 'Large pothole on Main Street', 'There is a significant pothole near the intersection of Main Street and Oak Avenue that is causing damage to vehicles. The hole is approximately 2 feet wide and 6 inches deep.', 'ROADS', 'PENDING', 'HIGH', 40.7128, -74.0060, '123 Main Street, New York, NY 10001', NULL, 'user-001', NOW(), NOW()),
('issue-002', 'Broken streetlight in Central Park', 'The streetlight near the main entrance of Central Park has been out for over a week, making the area unsafe for evening joggers and pedestrians.', 'LIGHTING', 'IN_PROGRESS', 'MEDIUM', 40.7829, -73.9654, 'Central Park Entrance, New York, NY 10024', NULL, 'user-002', NOW(), NOW()),
('issue-003', 'Overflowing trash bins at Washington Square', 'Multiple trash bins in Washington Square Park are overflowing, attracting pests and creating an unsanitary environment for park visitors.', 'SANITATION', 'RESOLVED', 'MEDIUM', 40.7308, -73.9973, 'Washington Square Park, New York, NY 10012', NULL, 'user-003', NOW(), NOW()),
('issue-004', 'Damaged playground equipment', 'The swing set at Riverside Park has broken chains and poses a safety hazard to children. Immediate attention needed.', 'PARKS', 'PENDING', 'URGENT', 40.7957, -73.9389, 'Riverside Park, New York, NY 10025', NULL, 'user-001', NOW(), NOW());

-- Insert sample comments
INSERT INTO comments (id, content, issueId, authorId, createdAt, updatedAt) VALUES
('comment-001', 'I can confirm this pothole is getting worse. My car tire was damaged yesterday.', 'issue-001', 'user-002', NOW(), NOW()),
('comment-002', 'The city should prioritize this repair before someone gets seriously hurt.', 'issue-001', 'user-003', NOW(), NOW()),
('comment-003', 'Great news! I saw a repair crew working on this light this morning.', 'issue-002', 'user-001', NOW(), NOW()),
('comment-004', 'Thank you for reporting this. The area is much safer now.', 'issue-003', 'user-002', NOW(), NOW());

-- Insert sample votes
INSERT INTO votes (id, issueId, userId, createdAt) VALUES
('vote-001', 'issue-001', 'user-002', NOW()),
('vote-002', 'issue-001', 'user-003', NOW()),
('vote-003', 'issue-002', 'user-001', NOW()),
('vote-004', 'issue-002', 'user-003', NOW()),
('vote-005', 'issue-004', 'user-002', NOW()),
('vote-006', 'issue-004', 'user-003', NOW());

-- Insert sample assignments
INSERT INTO assignments (id, department, issueId, assignedById, assignedAt, completedAt, notes) VALUES
('assign-001', 'Public Works', 'issue-002', 'admin-001', NOW(), NULL, 'Assigned to electrical maintenance team'),
('assign-002', 'Environmental Services', 'issue-003', 'admin-001', DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), 'Completed trash collection and added additional bins');
