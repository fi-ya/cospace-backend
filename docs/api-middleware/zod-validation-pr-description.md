# PR: feat/zod-validation

## Summary

Add Zod-based schema validation for the booking creation endpoint, replacing manual field-presence checks and hand-written TypeScript interfaces. Validation failures are now formatted and returned by the centralized error handler rather than the validation middleware itself.

## What Was Done

- Added `src/schemas/booking.schema.ts`:
  - `createBookingSchema`: `desk` (trimmed string, 3–100 chars), `floor` (trimmed string, 5–200 chars), `date` (ISO date string), `active` (optional boolean, defaults to `true`).
  - `bookingSchema`: extends `createBookingSchema` with `id: z.string()` for stored/response records.
  - `CreateBookingInput` and `Booking` types, both derived via `z.infer` instead of hand-written interfaces.
- Added `validateSchema` to `src/middleware/validate.ts`, a generic middleware factory that:
  - Accepts any `ZodSchema`.
  - Parses `req.body` with `schema.parse()` and reassigns `req.body` to the parsed result, so trimmed/defaulted values reach the controller.
  - On failure, calls `next(error)` instead of sending a response directly, so error formatting stays centralized.
- Updated `src/middleware/errorHandler.ts` to detect `ZodError` and return a structured `400` response:
  ```json
  { "error": "Validation failed", "fieldErrors": [{ "field": "desk", "message": "..." }] }
  ```
  Non-Zod errors still fall through to the existing `500` response with server-side stack logging.
- Removed the manual `Booking` interface from `src/repositories/booking.repository.ts`; the repository, service, controller, and routes now all import `Booking` from `src/schemas/booking.schema.ts`.
- Updated seed data in `booking.repository.ts` to use string `floor` values (e.g. `"Floor 1"`) to match the schema.
- Wired `validateSchema(createBookingSchema)` into `POST /bookings` in `src/routes/booking.routes.ts`, replacing the older `validate(["desk", "floor"])` field-presence check on that route.
- Documented verified request/response evidence in `docs/api-middleware/validation.md`, including real `400` responses for a too-short desk name and an invalid date, and proof that trailing whitespace is trimmed before storage.

## Known Limitation

`createBookingSchema` does not include an `id` field, so bookings created via `POST /bookings` are stored without an `id`. This is called out in `docs/api-middleware/validation.md` and is out of scope for this PR.

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

Verify a desk name that's too short is rejected:

```bash
curl -i -X POST http://localhost:5000/bookings \
  -H 'Authorization: super-secret-key' \
  -H 'Content-Type: application/json' \
  -d '{"desk":"AB","floor":"Floor 1","date":"2026-09-25","active":true}'
```

Expected: `400` with `{"error":"Validation failed","fieldErrors":[{"field":"desk","message":"Too small: expected string to have >=3 characters"}]}`.

Verify an invalid date is rejected:

```bash
curl -i -X POST http://localhost:5000/bookings \
  -H 'Authorization: super-secret-key' \
  -H 'Content-Type: application/json' \
  -d '{"desk":"Desk-05","floor":"Floor 1","date":"09/25/2026","active":true}'
```

Expected: `400` with `{"error":"Validation failed","fieldErrors":[{"field":"date","message":"Invalid ISO date"}]}`.

Verify whitespace trimming:

```bash
curl -i -X POST http://localhost:5000/bookings \
  -H 'Authorization: super-secret-key' \
  -H 'Content-Type: application/json' \
  -d '{"desk":"  Desk-99  ","floor":"Floor 3  ","date":"2026-09-26","active":true}'
```

Expected: `201 Created` with `desk` and `floor` trimmed of whitespace in the response, confirmed by a subsequent `GET /bookings`.

Formatting validation:

```bash
git diff --check
```
