# PR: feat/api-error-architecture

## Summary

Introduce a structured, class-based error architecture (`AppError` and four HTTP-specific subclasses) to replace ad-hoc `res.status(...).json(...)` calls scattered across controllers, middleware, and services. Every error response — expected or unexpected — now shares one consistent JSON shape.

## What Was Done

- Added `AppError` (`src/utils/appError.ts`), extending native `Error`:
  - Accepts `message` and `statusCode`.
  - Derives `status` (`"fail"` for 4xx, `"error"` for 5xx) and sets `isOperational = true`.
  - Calls `Error.captureStackTrace` and `Object.setPrototypeOf(this, new.target.prototype)` so `instanceof` checks resolve correctly for every subclass.
- Added four subclasses in `src/errors/`: `BadRequestError` (400), `UnauthorizedError` (401), `ForbiddenError` (403), `NotFoundError` (404).
- Added `src/constants/httpStatus.ts` — an `HttpStatus` enum replacing raw magic numbers throughout the codebase.
- Refactored `src/middleware/errorHandler.ts` to:
  - Handle malformed JSON (`SyntaxError` from `express.json()`) gracefully instead of falling through to a generic `500`.
  - Handle `AppError` instances first, responding with their own `statusCode` and the shared shape `{ status, message, errors }`.
  - Handle `ZodError` and any other unexpected error onto that same shape, so `404`, `400`, and `500` responses are all structurally identical.
  - Log unexpected errors' stack traces server-side only (`console.error`), returning a generic client-facing message (`"Something went wrong on our end"`) so no internal details ever reach the caller.
- Updated `src/controllers/booking.controller.ts`:
  - Every method now accepts `next: NextFunction`.
  - `create`/`update` catch blocks call `next(error)` instead of building a response directly.
  - Manual `404` responses replaced with `next(new NotFoundError("Booking not found"))`.
- Updated `src/middleware/auth.ts` to call `next(new UnauthorizedError())` instead of responding directly.
- Updated `src/middleware/validate.ts` (`validate` field-presence checker) to call `next(new BadRequestError(...))` instead of responding directly.
- Updated `src/services/booking.service.ts` to throw `BadRequestError` instead of a plain `Error` for the desk-length business rule.
- Updated `src/routes/booking.routes.ts` so every route wrapper forwards `next` to the controller.
- Documented verified evidence in `docs/api-middleware/error-handling.md`, including real `404`/`400`/`500` responses proving they share one shape, and proof the `500` response leaks no stack trace or internal details.

## Action Item Before Merging

`src/index.ts` currently contains two demo/debug routes used to manually verify error-handling behavior during development:

```ts
app.get("/boom-app-error", () => {
	throw new NotFoundError("Test resource not found");
});

app.get("/boom-unexpected", () => {
	throw new Error("db connection string: postgres://user:pass@internal-host/db");
});
```

These were intentionally left in for reviewer testing but should be removed (or moved behind a test-only flag) before this ships, since they expose throwable endpoints and a fake connection string literal.

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

Verify a `404` (via `NotFoundError`):

```bash
curl -i http://localhost:5000/bookings/999
```

Expected: `{"status":"fail","message":"Booking not found","errors":[]}`.

Verify a `400` (via Zod validation):

```bash
curl -i -X POST http://localhost:5000/bookings \
  -H 'Authorization: super-secret-key' \
  -H 'Content-Type: application/json' \
  -d '{"desk":"AB","floor":"Floor 1","date":"2026-09-25","active":true}'
```

Expected: `{"status":"fail","message":"Validation failed","errors":[...]}`.

Verify a `401` (via `UnauthorizedError`):

```bash
curl -i -X POST http://localhost:5000/bookings \
  -H 'Content-Type: application/json' \
  -d '{"desk":"Desk-05","floor":"Floor 1","date":"2026-09-25"}'
```

Expected: `{"status":"fail","message":"Unauthorized","errors":[]}`.

Verify malformed JSON is handled gracefully:

```bash
curl -i -X POST http://localhost:5000/bookings \
  -H 'Authorization: super-secret-key' \
  -H 'Content-Type: application/json' \
  -d '{"desk": "Desk-05", "floor": '
```

Expected: `400`, not a crash or a `500`.

Verify a `500` leaks nothing (via the temporary `/boom-unexpected` route, see action item above):

```bash
curl -i http://localhost:5000/boom-unexpected
```

Expected: `{"status":"error","message":"Something went wrong on our end","errors":[]}` — no stack trace or connection string in the response body.

Formatting validation:

```bash
git diff --check
```
