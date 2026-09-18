-- =============================================================================
-- COSPACE DATABASE SEED: 002_seed_test_data.sql
-- TARGET DATABASE: MySQL 8.x
-- DESCRIPTION: Seeds tables with test data conforming to 3NF.
--              Includes deliberate NULL values to test JOIN behaviors.
-- =============================================================================

USE cospace;

-- -----------------------------------------------------------------------------
-- 1. SEED TEAMS (4 Teams)
-- Note: 'Finance' will deliberately have zero employees assigned to it.
-- -----------------------------------------------------------------------------
INSERT INTO teams (id, name, department) VALUES
(1, 'Engineering', 'Technology'),
(2, 'Marketing', 'Growth'),
(3, 'Sales', 'Commercial'),
(4, 'Finance', 'Operations'); -- Empty team for LEFT JOIN verification

-- -----------------------------------------------------------------------------
-- 2. SEED DESKS (5 Desks)
-- Note: 'Desk 505' will deliberately have zero active bookings.
-- -----------------------------------------------------------------------------
INSERT INTO desks (id, name, floor) VALUES
(101, 'Window Desk A', 1),
(102, 'Quiet Corner B', 1),
(201, 'Standing Desk C', 2),
(202, 'Dual Monitor D', 2),
(505, 'Isolation Pod Z', 5); -- Empty desk for query testing

-- -----------------------------------------------------------------------------
-- 3. SEED ROOMS (3 Rooms)
-- -----------------------------------------------------------------------------
INSERT INTO rooms (id, name, floor, capacity) VALUES
(1, 'Ada Lovelace Suite', 1, 10),
(2, 'Alan Turing Boardroom', 2, 16),
(3, 'Grace Hopper Cabin', 2, 4);

-- -----------------------------------------------------------------------------
-- 4. SEED USERS (6 Employees)
-- Note: 'Charlie' is seeded with a NULL team_id to test JOIN dropouts.
-- Passwords are safe 60-character mock bcrypt strings.
-- -----------------------------------------------------------------------------
INSERT INTO users (id, first_name, last_name, email, role, password, team_id) VALUES
(1, 'Alice', 'Smith', 'alice.smith@brightmedia.com', 'admin', '$2b$10$S9G6iJzXQ8qXlOehqN4Zdu0m6YF.r67E3F.v2G5Z1Y3e2r9wM6eFa', 1),
(2, 'Bob', 'Jones', 'bob.jones@brightmedia.com', 'colleague', '$2b$10$S9G6iJzXQ8qXlOehqN4Zdu0m6YF.r67E3F.v2G5Z1Y3e2r9wM6eFa', 1),
(3, 'Charlie', 'Brown', 'charlie.brown@brightmedia.com', 'colleague', '$2b$10$S9G6iJzXQ8qXlOehqN4Zdu0m6YF.r67E3F.v2G5Z1Y3e2r9wM6eFa', NULL), -- No team
(4, 'Dana', 'White', 'dana.white@brightmedia.com', 'colleague', '$2b$10$S9G6iJzXQ8qXlOehqN4Zdu0m6YF.r67E3F.v2G5Z1Y3e2r9wM6eFa', 2),
(5, 'Eli', 'Davis', 'sub.davis@brightmedia.com', 'colleague', '$2b$10$S9G6iJzXQ8qXlOehqN4Zdu0m6YF.r67E3F.v2G5Z1Y3e2r9wM6eFa', 3),
(6, 'Fiona', 'Gallagher', 'fiona.g@brightmedia.com', 'colleague', '$2b$10$S9G6iJzXQ8qXlOehqN4Zdu0m6YF.r67E3F.v2G5Z1Y3e2r9wM6eFa', 3);

-- -----------------------------------------------------------------------------
-- 5. SEED BOOKINGS (Junction Table)
-- Note: 'Fiona' (user_id 6) has NO bookings.
-- -----------------------------------------------------------------------------
INSERT INTO bookings (id, user_id, desk_id, booking_date, active) VALUES
(1, 1, 101, '2026-09-16', 1), -- Alice booked Desk 101
(2, 2, 102, '2026-09-16', 1), -- Bob booked Desk 102
(3, 3, 201, '2026-09-16', 1), -- Charlie booked Desk 201
(4, 4, 202, '2026-09-16', 1), -- Dana booked Desk 202
(5, 5, 101, '2026-09-17', 1); -- Eli booked Desk 101 on a different day
