-- 50 SQL INSERT queries for sample issues
-- Note: Uses existing user IDs from your database (1-7, 21-30)

INSERT INTO issues (title, description, category, priority, status, address, latitude, longitude, reporter_id, created_at, updated_at) VALUES
('Pothole on Main Street', 'Large pothole causing damage to vehicles near the intersection of Main St and Oak Ave', 'ROADS', 'HIGH', 'PENDING', '123 Main Street, Downtown', 40.7128, -74.0060, 2, NOW(), NOW()),

('Broken Street Light', 'Street light has been out for 2 weeks on Elm Street, creating safety hazard', 'UTILITIES', 'MEDIUM', 'PENDING', '456 Elm Street, Westside', 40.7580, -73.9855, 21, NOW(), NOW()),

('Illegal Dumping in Park', 'Large pile of construction debris dumped in Riverside Park near the playground', 'ENVIRONMENT', 'HIGH', 'PENDING', 'Riverside Park, 789 Park Avenue', 40.7831, -73.9712, 22, NOW(), NOW()),

('Water Leak on Broadway', 'Water main leak causing flooding on Broadway between 5th and 6th streets', 'UTILITIES', 'URGENT', 'IN_PROGRESS', '567 Broadway, Theater District', 40.7589, -73.9851, 23, NOW(), NOW()),

('Graffiti on Public Building', 'Offensive graffiti on the side of the community center building', 'VANDALISM', 'LOW', 'PENDING', '234 Community Drive, Eastside', 40.7282, -73.7949, 24, NOW(), NOW()),

('Abandoned Vehicle', 'Car has been parked and abandoned on Pine Street for over a month', 'TRANSPORTATION', 'MEDIUM', 'PENDING', '890 Pine Street, Northside', 40.7831, -73.9712, 25, NOW(), NOW()),

('Noise Complaint - Construction', 'Construction work starting at 5 AM violating noise ordinance', 'NOISE', 'MEDIUM', 'PENDING', '345 Industrial Boulevard, Industrial Zone', 40.6892, -74.0445, 26, NOW(), NOW()),

('Damaged Sidewalk', 'Cracked and uneven sidewalk creating trip hazard for pedestrians', 'ROADS', 'MEDIUM', 'PENDING', '678 Maple Avenue, Residential Area', 40.7489, -73.9857, 27, NOW(), NOW()),

('Trash Not Collected', 'Garbage has not been picked up for 2 weeks on our street', 'SANITATION', 'HIGH', 'PENDING', '901 Oak Street, Southside', 40.7282, -74.0776, 28, NOW(), NOW()),

('Stray Dog Pack', 'Pack of stray dogs roaming the neighborhood, potential safety issue', 'ANIMAL_CONTROL', 'HIGH', 'PENDING', '123 Residential Lane, Suburbs', 40.7831, -73.9712, 29, NOW(), NOW()),

('Traffic Light Malfunction', 'Traffic light stuck on red at busy intersection causing major delays', 'TRANSPORTATION', 'URGENT', 'IN_PROGRESS', 'Intersection of 1st Ave and Market St', 40.7128, -74.0060, 30, NOW(), NOW()),

('Playground Equipment Broken', 'Swing set chains are broken and dangerous for children', 'PARKS', 'HIGH', 'PENDING', 'Central Park Playground, 567 Park Road', 40.7831, -73.9712, 1, NOW(), NOW()),

('Sewer Backup', 'Sewage backing up into basement of residential building', 'UTILITIES', 'URGENT', 'PENDING', '789 Basement Avenue, Downtown', 40.7580, -73.9855, 2, NOW(), NOW()),

('Illegal Parking', 'Vehicles consistently parking in handicap spaces without permits', 'TRANSPORTATION', 'MEDIUM', 'PENDING', '234 Shopping Center Drive, Commercial District', 40.7489, -73.9857, 3, NOW(), NOW()),

('Tree Blocking Road', 'Large tree fell across Cedar Street after last storm', 'ENVIRONMENT', 'URGENT', 'RESOLVED', '456 Cedar Street, Forest Hills', 40.7282, -73.7949, 4, NOW(), NOW()),

('Public Restroom Vandalized', 'Public restroom in downtown park has been vandalized and is unusable', 'VANDALISM', 'MEDIUM', 'PENDING', 'Downtown Park, 678 Central Plaza', 40.7128, -74.0060, 5, NOW(), NOW()),

('Dead Animal on Road', 'Large dead animal in middle of highway creating traffic hazard', 'ANIMAL_CONTROL', 'HIGH', 'PENDING', 'Highway 101, Mile Marker 45', 40.6892, -74.0445, 6, NOW(), NOW()),

('Broken Fire Hydrant', 'Fire hydrant damaged and leaking water continuously', 'UTILITIES', 'HIGH', 'IN_PROGRESS', '890 Safety Street, Fire District', 40.7831, -73.9712, 7, NOW(), NOW()),

('Overgrown Weeds', 'Vacant lot overgrown with weeds becoming fire hazard', 'ENVIRONMENT', 'MEDIUM', 'PENDING', '123 Vacant Lot Road, Outskirts', 40.7580, -73.9855, 21, NOW(), NOW()),

('Streetlight Too Bright', 'New LED streetlight is too bright and shining into bedroom windows', 'UTILITIES', 'LOW', 'PENDING', '345 Quiet Street, Residential', 40.7489, -73.9857, 22, NOW(), NOW()),

('Crosswalk Faded', 'Crosswalk paint has faded and is barely visible to drivers', 'TRANSPORTATION', 'MEDIUM', 'PENDING', '567 School Street, School Zone', 40.7282, -74.0776, 23, NOW(), NOW()),

('Public Wi-Fi Down', 'Free public Wi-Fi has been down in the library for 3 weeks', 'UTILITIES', 'LOW', 'PENDING', '789 Library Boulevard, Cultural District', 40.7128, -74.0060, 24, NOW(), NOW()),

('Homeless Encampment', 'Large homeless encampment under bridge needs social services intervention', 'SOCIAL_SERVICES', 'MEDIUM', 'PENDING', 'Under Bridge at River Road', 40.7831, -73.9712, 25, NOW(), NOW()),

('Mailbox Vandalized', 'Public mailbox has been damaged and mail is being stolen', 'VANDALISM', 'MEDIUM', 'PENDING', '901 Post Office Square, Government District', 40.7580, -73.9855, 26, NOW(), NOW()),

('Ice on Sidewalk', 'Sidewalks not salted creating slip hazard for pedestrians', 'ROADS', 'HIGH', 'PENDING', '234 Winter Street, Business District', 40.7489, -73.9857, 27, NOW(), NOW()),

('Bus Stop Damaged', 'Bus stop shelter has broken glass and graffiti', 'TRANSPORTATION', 'MEDIUM', 'PENDING', '456 Transit Avenue, Public Transit Hub', 40.7282, -73.7949, 28, NOW(), NOW()),

('Water Fountain Broken', 'Public water fountain in park has been broken for months', 'UTILITIES', 'LOW', 'PENDING', '678 Recreation Park, Sports Complex', 40.6892, -74.0445, 29, NOW(), NOW()),

('Rats in Alley', 'Large rat infestation in alley behind restaurants', 'PEST_CONTROL', 'HIGH', 'PENDING', '890 Restaurant Row, Food District', 40.7831, -73.9712, 30, NOW(), NOW()),

('Broken Bench', 'Park bench is broken and has sharp metal edges', 'PARKS', 'MEDIUM', 'PENDING', '123 Peaceful Park, Green Space', 40.7580, -73.9855, 1, NOW(), NOW()),

('Leaf Collection Missed', 'Our street was skipped during the fall leaf collection', 'SANITATION', 'LOW', 'PENDING', '345 Maple Grove Street, Suburban Area', 40.7489, -73.9857, 2, NOW(), NOW()),

('Flooding After Rain', 'Street floods every time it rains due to poor drainage', 'UTILITIES', 'HIGH', 'PENDING', '567 Low Valley Road, Flood Zone', 40.7282, -74.0776, 3, NOW(), NOW()),

('Abandoned Shopping Cart', 'Shopping cart abandoned in middle of street for weeks', 'SANITATION', 'LOW', 'RESOLVED', '789 Grocery Street, Shopping Area', 40.7128, -74.0060, 4, NOW(), NOW()),

('Dangerous Intersection', 'No stop signs at intersection where accidents frequently occur', 'TRANSPORTATION', 'URGENT', 'PENDING', 'Intersection of Danger Ave and Risk Street', 40.7831, -73.9712, 5, NOW(), NOW()),

('Public Pool Closed', 'Community pool has been closed for repairs but no timeline given', 'PARKS', 'MEDIUM', 'IN_PROGRESS', '901 Swimming Pool Drive, Recreation Center', 40.7580, -73.9855, 6, NOW(), NOW()),

('Bicycle Path Blocked', 'Construction materials blocking dedicated bicycle path', 'TRANSPORTATION', 'MEDIUM', 'PENDING', '234 Bike Trail, Green Corridor', 40.7489, -73.9857, 7, NOW(), NOW()),

('Manhole Cover Missing', 'Manhole cover is missing creating dangerous hole in street', 'UTILITIES', 'URGENT', 'IN_PROGRESS', '456 Underground Street, Utility Zone', 40.7282, -73.7949, 21, NOW(), NOW()),

('Dog Park Fence Broken', 'Fence around dog park has large holes allowing dogs to escape', 'PARKS', 'MEDIUM', 'PENDING', '678 Pet Park Avenue, Animal Area', 40.6892, -74.0445, 22, NOW(), NOW()),

('Speed Bumps Needed', 'Cars speeding through residential area need speed control measures', 'TRANSPORTATION', 'MEDIUM', 'PENDING', '890 Family Street, Quiet Neighborhood', 37.7749, -122.4194, 23, NOW(), NOW()),

('Broken Parking Meter', 'Parking meter is broken and not accepting payment', 'TRANSPORTATION', 'LOW', 'PENDING', '123 Downtown Parking, Business Core', 40.7580, -73.9855, 24, NOW(), NOW()),

('Litter Accumulation', 'Large amount of litter accumulated along highway on-ramp', 'ENVIRONMENT', 'MEDIUM', 'PENDING', 'Highway On-Ramp at Exit 12', 40.7489, -73.9857, 25, NOW(), NOW()),

('Building Code Violation', 'New construction appears to violate building height restrictions', 'ZONING', 'MEDIUM', 'PENDING', '345 Development Street, Construction Zone', 40.7282, -74.0776, 26, NOW(), NOW()),

('Public Art Vandalized', 'Public sculpture has been spray painted with graffiti', 'VANDALISM', 'LOW', 'PENDING', '567 Art Square, Cultural Center', 40.7128, -74.0060, 27, NOW(), NOW()),

('Smoking in Non-Smoking Area', 'People consistently smoking in designated non-smoking public area', 'HEALTH', 'LOW', 'PENDING', '789 Health Plaza, Medical District', 40.7831, -73.9712, 28, NOW(), NOW()),

('Construction Dust', 'Excessive dust from construction site affecting air quality', 'ENVIRONMENT', 'MEDIUM', 'PENDING', '901 Construction Boulevard, Development Area', 40.7580, -73.9855, 29, NOW(), NOW()),

('Broken Railing', 'Safety railing on bridge is broken and dangerous', 'INFRASTRUCTURE', 'HIGH', 'PENDING', '234 Bridge Street, River Crossing', 40.7489, -73.9857, 30, NOW(), NOW()),

('Inadequate Lighting', 'Dark alley needs better lighting for safety', 'UTILITIES', 'MEDIUM', 'PENDING', '456 Dark Alley, Behind Main Street', 40.7282, -73.7949, 1, NOW(), NOW()),

('Recycling Bin Overflow', 'Public recycling bins are constantly overflowing', 'SANITATION', 'MEDIUM', 'PENDING', '678 Green Street, Environmental Zone', 40.6892, -74.0445, 2, NOW(), NOW()),

('Fence Blocking Sidewalk', 'Private fence extends onto public sidewalk blocking pedestrians', 'ZONING', 'MEDIUM', 'PENDING', '890 Property Line Street, Residential', 40.7831, -73.9712, 3, NOW(), NOW()),

('Public Computer Broken', 'Public access computers in library are not working', 'UTILITIES', 'LOW', 'PENDING', '123 Digital Avenue, Information Center', 40.7580, -73.9855, 4, NOW(), NOW()),

('Overgrown Tree Branches', 'Tree branches hanging too low over sidewalk hitting pedestrians', 'ENVIRONMENT', 'MEDIUM', 'RESOLVED', '345 Tree Line Street, Canopy Road', 40.7489, -73.9857, 5, NOW(), NOW());
