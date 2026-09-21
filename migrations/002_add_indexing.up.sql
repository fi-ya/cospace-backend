-- =============================================================================
-- 🚀 FILE: migrations/002_add_indexing.up.sql
-- Topic: Upward Migration (Creating the Composite Unique Index)
-- Application: CoSpace (BrightMedia Hot-Desking Platform)
-- =============================================================================

-- Add a unique composite index to enforce the business rule:
-- "Two colleagues cannot book the same physical desk on the same calendar day."
-- Since it is a UNIQUE index, it acts simultaneously as a constraint and a lookup optimiser.
ALTER TABLE bookings 
ADD CONSTRAINT uniq_desk_date UNIQUE (desk_id, booking_date);
