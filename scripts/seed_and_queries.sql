-- =============================================================================
-- 📂 seed_and_queries.sql
-- Topic: Capstone Database Seeding and Reporting Queries
-- Application: CoSpace (BrightMedia Hot-Desking Platform)
-- =============================================================================

USE cospace;

-- =============================================================================
-- 🌱 SECTION 1: DATABASE SEEDING
-- =============================================================================

-- Ensure child tables are cleared first to prevent Foreign Key errors on reset
DELETE FROM bookings;
DELETE FROM users;
DELETE FROM desks;
DELETE FROM rooms;
DELETE FROM teams;

-- 1. Seed 3 Teams
INSERT INTO teams (id, name, department) VALUES
(1, 'Creative Studio', 'Marketing'),
(2, 'Platform Engineering', 'Technology'),
(3, 'Corporate Operations', 'HR & Finance');

-- 2. Seed 8 Colleagues (Users)
-- We use 'CONCAT_WS' friendly values. 'Frank Miller' has no bookings.
INSERT INTO users (id, first_name, last_name, email, team_id) VALUES
(1, 'Alice', 'Smith', 'alice.smith@brightmedia.com', 1),
(2, 'Ben', 'Jones', 'ben.jones@brightmedia.com', 2),
(3, 'Chloe', 'Taylor', 'chloe.taylor@brightmedia.com', 2),
(4, 'David', 'Brown', 'david.brown@brightmedia.com', 1),
(5, 'Emma', 'Wilson', 'emma.weiss@brightmedia.com', 3),
(6, 'Frank', 'Miller', 'frank.miller@brightmedia.com', 3), -- No Bookings Case!
(7, 'Grace', 'Davis', 'grace.davis@brightmedia.com', 2),
(8, 'Henry', 'Clark', 'henry.clark@brightmedia.com', 1);

-- 3. Seed 3 Meeting Rooms
INSERT INTO rooms (id, name, floor, capacity) VALUES
(1, 'Piccadilly', 1, 12),
(2, 'Soho', 2, 6),
(3, 'Westminster', 1, 4);

-- 4. Seed 4 Desks
INSERT INTO desks (id, name, floor) VALUES
(1, 'Desk-01', 1),
(2, 'Desk-02', 1),
(3, 'Desk-03', 2),
(4, 'Desk-04', 2);

-- 5. Seed 6 Bookings
-- • We book Desk 1 on TWO different days (2026-09-21 and 2026-09-22).
-- • User 6 (Frank Miller) is left with 0 bookings.
INSERT INTO bookings (id, user_id, desk_id, booking_date) VALUES
(1, 1, 1, '2026-09-21'), -- Alice books Desk-01 on Day 1
(2, 2, 1, '2026-09-22'), -- Ben books Desk-01 on Day 2 (Desk booked on different days)
(3, 3, 2, '2026-09-21'), -- Chloe books Desk-02
(4, 4, 3, '2026-09-21'), -- David books Desk-03
(5, 5, 4, '2026-09-21'), -- Emma books Desk-04
(6, 7, 3, '2026-09-22'); -- Grace books Desk-03


-- =============================================================================
-- 📊 SECTION 2: THE CAPSTONE REPORTING QUERY
-- =============================================================================
-- This query retrieves all 8 colleagues, displaying full name, team name, 
-- and the total number of desk bookings. 
--
-- Technical Rules:
-- 1. LEFT JOIN is used to keep colleagues with 0 bookings (like Frank).
-- 2. CONCAT_WS ensures that even if a first/last name field is missing, it won't resolve to NULL.
-- 3. COUNT(b.id) is used instead of COUNT(*) to prevent unbooked colleagues showing '1'.
-- 4. Grouping respects MySQL's ONLY_FULL_GROUP_BY settings.

SELECT 
    CONCAT_WS(' ', u.first_name, u.last_name) AS colleague_name,
    COALESCE(t.name, 'No Assigned Team') AS team_name,
    COUNT(b.id) AS total_desks_booked
FROM users u
LEFT JOIN teams t ON u.team_id = t.id
LEFT JOIN bookings b ON u.id = b.user_id
GROUP BY u.id, u.first_name, u.last_name, t.name
ORDER BY total_desks_booked DESC, colleague_name ASC;


-- =============================================================================
-- 🔄 SECTION 3: DATA MODIFICATION (UPDATE)
-- =============================================================================
-- Moves Henry Clark (User 8) from Team 1 (Creative Studio) to Team 2 (Platform Engineering)
UPDATE users
SET team_id = 2
WHERE id = 8;


-- =============================================================================
-- 🗑️ SECTION 4: DESTRUCTION & REFERENTIAL INTEGRITY TEST (DELETE)
-- =============================================================================
-- Delete Desk 3 from the inventory.
-- This triggers referential integrity rules. Since 'bookings' is configured with 
-- ON DELETE CASCADE for foreign key 'desk_id', any booking linked to Desk-03 
-- (Bookings 4 and 6) will be automatically deleted.
DELETE FROM desks
WHERE id = 3;

-- Quick query to verify the cascade aftermath
SELECT * FROM bookings;

---
-- =============================================================================
-- 🔍 PART 2: The Five Mastery Queries & Verification (CoSpace Implementation)
-- =============================================================================

-- Query 1: INNER JOIN (Selects matching names from both tables)
-- Returns: 7 rows (Frank Miller is omitted because his team_id is NULL)
SELECT 
    CONCAT_WS(' ', u.first_name, u.last_name) AS colleague_name, 
    t.name AS team_name
FROM users u
INNER JOIN teams t ON u.team_id = t.id;


-- Query 2: LEFT JOIN (Keeps all users, even those with unmatched teams)
-- Returns: 8 rows (Frank Miller is included in the output, showing NULL under team_name)
SELECT 
    CONCAT_WS(' ', u.first_name, u.last_name) AS colleague_name, 
    t.name AS team_name
FROM users u
LEFT JOIN teams t ON u.team_id = t.id;


-- Query 3: Finding the Empty Team (Where no users/colleagues are assigned)
-- Returns: 0 rows initially with our seed, but if a team is empty, it will be listed.
-- Uses LEFT JOIN from teams to users and filters for NULLs.
SELECT 
    t.name AS empty_team
FROM teams t
LEFT JOIN users u ON t.id = u.team_id
WHERE u.id IS NULL;


-- Query 4: Grouped Count (Counting colleagues presence per team)
-- Returns: 3 rows (Creative Studio: 3, Platform Engineering: 3, Corporate Operations: 2)
-- Crucial Note: We count 'u.id' rather than '*' so that empty teams resolve to 0 instead of 1.
SELECT 
    t.name AS team_name, 
    COUNT(u.id) AS total_colleagues
FROM teams t
LEFT JOIN users u ON t.id = u.team_id
GROUP BY t.id, t.name;



