# PR: feat/api-middleware

## Summary

Add custom Express middleware for request logging, header-based authentication, request body validation, and centralized error handling to the CoSpace booking API. Auth and validation are scoped to booking mutation routes only, keeping public reads unrestricted.

## What Was Done

- Added `logger` middleware (`src/middleware/logger.ts`) that logs the HTTP method, path, and an ISO timestamp for every request, then calls `next()`.
- Added `auth` middleware (`src/middleware/auth.ts`) that checks the `Authorization` header against a fixed token and short-circuits with `401 Unauthorized` JSON when it doesn't match.
- Added `validate` middleware factory (`src/middleware/validate.ts`) that accepts an array of required field names, checks them against `req.body`, and short-circuits with `400 Bad Request` listing any missing fields.
- Added `errorHandler` middleware (`src/middleware/errorHandler.ts`) with the required four-parameter signature (`err, req, res, next`) so Express recognises it as an error handler. It logs the stack trace server-side and returns a generic `500` JSON response to the client.
- Added `src/types/express.d.ts` to extend Express's `Request` interface via declaration merging, adding an optional `user: { role: string }` property.
- Registered `logger` and `errorHandler` globally in `src/index.ts`; `logger` runs first (after `express.json()`), `errorHandler` runs last, after all routes.
- Applied `auth` and `validate` selectively at the route level in `src/routes/booking.routes.ts`:
  - `GET /bookings` and `GET /bookings/:id` remain public.
  - `POST /bookings` requires `auth` and `validate(["desk", "floor"])`.
  - `PUT /bookings/:id`, `PATCH /bookings/:id`, and `DELETE /bookings/:id` require `auth`.
- Documented verified request/response evidence in `docs/api-middleware/middleware.md`, including a real logged line, a real `401` response, and the observed failure when the error handler's fourth parameter is removed.

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

Verify logging (check the server console for a line like `[timestamp] GET /bookings`):

```bash
curl http://localhost:5000/bookings
```

Verify auth is enforced on mutation routes but not on reads:

```bash
curl -i -X POST http://localhost:5000/bookings \
  -H 'Content-Type: application/json' \
  -d '{"desk":"Desk-05","floor":1,"date":"2026-09-25","active":true}'
```

Expected: `401 Unauthorized` with `{"error":"Unauthorized"}`.

```bash
curl -i http://localhost:5000/bookings
```

Expected: `200 OK` (no auth required).

Verify validation with a valid token but missing fields:

```bash
curl -i -X POST http://localhost:5000/bookings \
  -H 'Authorization: super-secret-key' \
  -H 'Content-Type: application/json' \
  -d '{"date":"2026-09-25","active":true}'
```

Expected: `400 Bad Request` listing `desk` and `floor` as missing fields.

Verify a full valid request succeeds:

```bash
curl -i -X POST http://localhost:5000/bookings \
  -H 'Authorization: super-secret-key' \
  -H 'Content-Type: application/json' \
  -d '{"id":"4","desk":"Desk-04","floor":2,"date":"2026-09-24","active":true}'
```

Expected: `201 Created` with the new booking.

Formatting validation:

```bash
git diff --check
```
