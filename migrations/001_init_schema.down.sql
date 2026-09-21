-- =============================================================================
-- COSPACE DATABASE MIGRATION: 001_init_schema.down.sql
-- TARGET DATABASE: MySQL 8.x
-- DESCRIPTION: Reverses 001_init_schema.up.sql cleanly.
-- =============================================================================

-- To tear down successfully, we must drop child tables (foreign key holders) 
-- BEFORE their corresponding parent tables. Dropping a parent first will violate 
-- referential integrity constraints and throw SQL Error 1217.

-- Step 1: Drop child/junction tables first (no other tables point to these)
DROP TABLE IF EXISTS bookings;

-- 2. Drop intermediate children/standalone tables
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS desks;
DROP TABLE IF EXISTS rooms;

-- 3. Drop ultimate parent tables last
DROP TABLE IF EXISTS teams;
