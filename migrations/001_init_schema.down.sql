-- =============================================================================
-- COSPACE DATABASE MIGRATION: 001_init_schema.down.sql
-- TARGET DATABASE: MySQL 8.x
-- DESCRIPTION: Reverses 001_init_schema.up.sql cleanly.
-- =============================================================================

-- Step 1: Drop child/junction tables first (no other tables point to these)
DROP TABLE IF EXISTS bookings;

-- Step 2: Drop dependent table containing team_id references
DROP TABLE IF EXISTS users;

-- Step 3: Drop independent parent tables safely
DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS desks;
DROP TABLE IF EXISTS teams;
