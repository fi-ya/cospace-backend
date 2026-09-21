-- =============================================================================
-- COSPACE DATABASE MIGRATION: 001_init_schema.up.sql
-- TARGET DATABASE: MySQL 8.x
-- DESCRIPTION: Creates base 3NF tables for BrightMedia Hybrid Office.
-- =============================================================================

-- 1. Create Parent Table: teams
CREATE TABLE IF NOT EXISTS teams (
  id         INT PRIMARY KEY AUTO_INCREMENT,
  name       VARCHAR(100) NOT NULL UNIQUE,
  department VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Create Parent Table: desks
CREATE TABLE IF NOT EXISTS desks (
  id    INT PRIMARY KEY AUTO_INCREMENT,
  name  VARCHAR(100) NOT NULL UNIQUE,
  floor INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Create Parent Table: rooms
CREATE TABLE IF NOT EXISTS rooms (
  id       INT PRIMARY KEY AUTO_INCREMENT,
  name     VARCHAR(100) NOT NULL UNIQUE,
  floor    INT NOT NULL,
  capacity INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Create Dependent Table: users (Points to teams)
CREATE TABLE IF NOT EXISTS users (
  id         INT PRIMARY KEY AUTO_INCREMENT,
  first_name VARCHAR(100) NOT NULL,
  last_name  VARCHAR(100) NOT NULL,
  email      VARCHAR(191) NOT NULL UNIQUE, -- 191 is safety limit for indexes in MySQL utf8mb4
  team_id    INT,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Create Junction Table: bookings (Points to users and desks)
CREATE TABLE IF NOT EXISTS bookings (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  user_id      INT NOT NULL,
  desk_id      INT NOT NULL,
  booking_date DATE NOT NULL,
  active       TINYINT(1) NOT NULL DEFAULT 1, -- Representing active/inactive Boolean
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (desk_id) REFERENCES desks(id) ON DELETE CASCADE,
  CONSTRAINT uq_user_desk_date UNIQUE (user_id, desk_id, booking_date) -- Prevents double booking the same desk or double booking the same user on the same date
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
