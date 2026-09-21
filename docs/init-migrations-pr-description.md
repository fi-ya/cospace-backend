## 🚀 PR: feat/db-initial-migration | Implement 3NF Relational Schema

### 📋 Overview
This PR implements the initial migration pair (`001_init_schema.up.sql` and `001_init_schema.down.sql`) to establish the database schema foundation for CoSpace.

### 🛡️ Referential Integrity & Cascade Decisions
* **`bookings -> users (ON DELETE CASCADE)`**: If an employee leaves BrightMedia and their user profile is deleted, we automatically sweep and clean up their associated future desk bookings. This prevents "orphaned" reservation records and keeps the database clean.
* **`bookings -> desks (ON DELETE CASCADE)`**: If BrightMedia reorganizes physical office floors and retires a desk, any active desk reservations tied to that desk are instantly wiped out rather than locking the database.
* **`users -> teams (ON DELETE SET NULL)`**: If an organizational team (e.g., Marketing) is disbanded or deleted, employees belong to that team remain in the system, but their `team_id` is updated to `NULL` to keep their active employee profile intact.

### ✅ Testing Verification
I have successfully verified that this migration pair runs error-free forwards and backwards:
1. Run UP migration: Built schema from nothing. All 5 tables verified in terminal via `SHOW TABLES;`.
2. Run DOWN migration: Successfully cleared all tables with zero foreign key constraint errors.
3. Run UP migration again: Rebuilt schema cleanly. Round-trip verified.
