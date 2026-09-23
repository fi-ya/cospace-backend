# PR: feat/api-crud-pagination

## Summary

Add offset-based pagination to `GET /bookings`, replacing the unpaginated `findAll()` response with a `{ data, meta }` payload, and enforce robust query-parameter parsing so malformed or malicious pagination requests can't produce `NaN` results, negative array offsets, or unbounded page sizes.

## What Was Done

- Added `findPaginated(skip, limit)` and `count()` to `src/repositories/booking.repository.ts`:
  - `findPaginated` slices the in-memory array using `Array.prototype.slice(skip, skip + limit)`.
  - `count()` returns the total number of stored bookings.
- Added `getPaginatedShifts(page, limit)` to `src/services/booking.service.ts`:
  - Converts `page` to a `skip` offset (`(page - 1) * limit`).
  - Combines `bookingRepository.findPaginated()` and `bookingRepository.count()` into one result.
  - Computes `totalPages` with `Math.ceil(totalItems / limit)`, so partial pages are always counted.
  - Returns `{ data, meta: { totalItems, itemsPerPage, currentPage, totalPages } }`, matching the pagination convention documented in the project's copilot-instructions.
- Updated `getAll` in `src/controllers/booking.controller.ts`:
  - Added a `parseIntWithDefault` utility using `parseInt(value, 10)` with an explicit `Number.isNaN` check, replacing looser `Number(...) || default` coercion.
  - Clamps `page` to a minimum of `1` (`Math.max(..., 1)`), preventing `page <= 0` from producing negative array offsets.
  - Clamps `limit` to the range `[1, 50]` (`Math.min(Math.max(..., 1), 50)`), enforcing the documented default page size (10, applied as the fallback) and hard maximum (50), so a request like `?limit=999999` cannot pull the entire dataset in one call.
- Documented verified pagination behavior in `docs/api-middleware/pagination.md`, including real responses for `?page=1&limit=3` and `?page=2&limit=3` (no repeated records across pages), and the clamped fallback values returned for `?page=abc` and `?limit=999999`.

## How to Test

Install dependencies if needed:

```bash
npm install
```

Run the TypeScript type checker:

```bash
npx tsc --noEmit
```

Start the development server:

```bash
npm run dev
```

Seed a few extra bookings so pagination across multiple pages is visible:

```bash
for i in 4 5 6; do curl -sS -X POST http://localhost:5000/bookings \
  -H 'Authorization: super-secret-key' \
  -H 'Content-Type: application/json' \
  -d "{\"desk\":\"Desk-0${i}\",\"floor\":\"Floor 1\",\"date\":\"2026-09-2${i}\",\"active\":true}"; done
```

Verify two distinct, non-overlapping pages:

```bash
curl -sS 'http://localhost:5000/bookings?page=1&limit=3'
curl -sS 'http://localhost:5000/bookings?page=2&limit=3'
```

Expected: page 1 returns `Desk-01, Desk-02, Desk-03`; page 2 returns `Desk-04, Desk-05, Desk-06`; both report `totalPages: 2`.

Verify invalid input falls back to safe defaults:

```bash
curl -sS 'http://localhost:5000/bookings?page=abc'
```

Expected: `currentPage: 1`.

Verify an oversized limit is capped:

```bash
curl -sS 'http://localhost:5000/bookings?limit=999999'
```

Expected: `itemsPerPage: 50`.

Verify zero/negative values are clamped:

```bash
curl -sS 'http://localhost:5000/bookings?page=0&limit=-5'
curl -sS 'http://localhost:5000/bookings?page=-3&limit=0'
```

Expected: both return `currentPage: 1, itemsPerPage: 1`.

Formatting validation:

```bash
git diff --check
```
