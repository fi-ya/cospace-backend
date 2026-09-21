## 🚀 PR: feat/db-seed-and-reporting | Seeding, Aggregate Reporting, and Cascade Validation

### 📋 Overview
This final capstone PR delivers the seed datasets and reporting queries required to close out the CoSpace database model.

### 📊 Reporting Query Metrics & Arithmetic
My reporting query returns **8 rows** (one for every employee in the system). Here is the arithmetic verification:

| Colleague Name | Team Name | Total Desks Booked |
| :--- | :--- | :---: |
| Alice Smith | Creative Studio | 1 |
| Ben Jones | Platform Engineering | 1 |
| Chloe Taylor | Platform Engineering | 1 |
| David Brown | Creative Studio | 1 |
| Emma Wilson | Corporate Operations | 1 |
| Grace Davis | Platform Engineering | 1 |
| Henry Clark | Creative Studio | 0 |
| Frank Miller | Corporate Operations | 0 |
| **SUM TOTAL** | | **6** |

* **Zero-Booking Verification**: `Frank Miller` and `Henry Clark` successfully appear in the report with a count of **`0`**. This proves that `LEFT JOIN` was used correctly and that we counted `b.id` (booking ID) instead of using `COUNT(*)`.
* **Desk Re-use Verification**: `Desk-01` was booked on two different days (by Alice and Ben). This query resolves both entries perfectly without compounding or duplicates.

### 🗑️ Referencing Integrity & Deletion Cascade Behavior
When executing `DELETE FROM desks WHERE id = 3;`, the following behaviors occurred:
* **The Impact**: Bookings **4** and **6** (which referenced `desk_id = 3`) were silently and automatically deleted by the database engine.
* **Does this match expectations?**: Yes. This matches the `ON DELETE CASCADE` constraint configured during session `001`. It cleanly wiped the booking records rather than leaving orphaned child rows or blocking the database from executing the delete.

### ✅ Round-Trip Testing
I successfully ran:
1. `001` and `002` migrations down and up.
2. Loaded the seed script.
3. Executed modifications and deletions cleanly with zero reference errors.
