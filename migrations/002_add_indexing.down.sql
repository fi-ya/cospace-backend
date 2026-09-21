-- =============================================================================
-- 🧹 FILE: migrations/002_add_indexing.down.sql
-- Topic: Downward Migration (Reversing the Composite Unique Index)
-- Application: CoSpace (BrightMedia Hot-Desking Platform)
-- =============================================================================

-- Safely roll back the migration by dropping the unique constraint / index.
-- This reverts the table structure back to its state at the end of migration 001.
ALTER TABLE bookings 
DROP INDEX uniq_desk_date;
