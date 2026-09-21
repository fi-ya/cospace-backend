## 🚀 PR: feat/db-booking-index | Implement Composite Unique Constraint

### 📋 Overview
This PR implements our second migration set (`002_add_indexing.up.sql` and `002_add_indexing.down.sql`) to introduce a unique composite index (`uniq_desk_date`) over `(desk_id, booking_date)` on our `bookings` table.

### 🚨 Double-Booking Error Verification
When attempting to insert a second booking for the same desk on the same day, the database rejected the command and returned the following error message:

```text
ERROR 1062 (23000): Duplicate entry '1-2026-09-21' for key 'bookings.uniq_desk_date'
