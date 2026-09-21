# PR: feat/api-routing

## Summary

Add the first booking API routes for CoSpace using an in-memory data store. The API supports reading, creating, replacing, updating, and deleting bookings through a typed Express router mounted at `/bookings`.

## What Was Done

- Added the `Booking` interface with string IDs and fields for desk, floor, date, and active status.
- Added three initial in-memory mock bookings.
- Created `src/routes/bookings.ts` and moved the booking state and route handlers into it.
- Mounted the router from `src/index.ts` at `/bookings`.
- Added six endpoints:
  - `GET /bookings` returns all bookings with `200`.
  - `GET /bookings/:id` returns one booking with `200`.
  - `POST /bookings` adds a booking from `req.body` and returns `201`.
  - `PUT /bookings/:id` replaces the complete booking at the matching index and returns `200`.
  - `PATCH /bookings/:id` toggles only the `active` field at the matching index and returns `200`.
  - `DELETE /bookings/:id` removes the matching booking and returns `204 No Content`.
- Typed route parameters as `{ id: string }` and compared them directly with string booking IDs.
- Used `findIndex()` for persistent `PUT` and `PATCH` array updates.
- Added consistent `404` responses:

```json
{ "error": "Booking not found" }
```

- Documented the route plan and verified curl examples in `docs/api-middleware/routing.md`.

## How to Test

Install dependencies if needed:

```bash
npm install
```

Run the type checker:

```bash
npx tsc --noEmit
```

Start the development server:

```bash
npm run dev
```

Test the collection endpoint:

```bash
curl http://localhost:5000/bookings
```

Test a successful POST:

```bash
curl -i -X POST http://localhost:5000/bookings \
  -H 'Content-Type: application/json' \
  -d '{"id":"4","desk":"Desk-04","floor":2,"date":"2026-09-24","active":true}'
```

Test the single-booking endpoint:

```bash
curl -i http://localhost:5000/bookings/2
```

Test the not-found response:

```bash
curl -i http://localhost:5000/bookings/999
```

Test the mutation routes:

```bash
curl -i -X PUT http://localhost:5000/bookings/1 \
  -H 'Content-Type: application/json' \
  -d '{"id":"1","desk":"Desk-09","floor":3,"date":"2026-09-30","active":true}'

curl -i -X PATCH http://localhost:5000/bookings/2

curl -i -X DELETE http://localhost:5000/bookings/3
```

The delete request should return `204 No Content`. `git diff --check` should also pass.
