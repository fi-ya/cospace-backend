# Error Handling

All errors, regardless of type or status code, share one JSON shape: `{ status, message, errors }`.

## 404: Booking Not Found

```bash
curl -sS -i http://localhost:5000/bookings/999
```

```json
{"status":"fail","message":"Booking not found","errors":[]}
```

Produced by throwing `NotFoundError` (a subclass of `AppError`) from the controller and forwarding it with `next(new NotFoundError("Booking not found"))`.

## 400: Validation Failed

```bash
curl -sS -i -X POST http://localhost:5000/bookings \
  -H 'Authorization: super-secret-key' \
  -H 'Content-Type: application/json' \
  -d '{"desk":"AB","floor":"Floor 1","date":"2026-09-25","active":true}'
```

```json
{"status":"fail","message":"Validation failed","errors":[{"field":"desk","message":"Too small: expected string to have >=3 characters"}]}
```

## 500: Unexpected Error

```bash
curl -sS -i http://localhost:5000/boom-unexpected
```

```json
{"status":"error","message":"Something went wrong on our end","errors":[]}
```

The route underneath this endpoint threw:

```ts
throw new Error("db connection string: postgres://user:pass@internal-host/db");
```

## Proof the 500 Leaks Nothing

The client-facing body above contains no file paths, stack frames, or the connection string that was actually thrown. The real error, including the connection string and full stack trace, only ever reaches `console.error(err.stack)` inside `errorHandler.ts` — server-side logs only, never the HTTP response.

## Why `Object.setPrototypeOf` Is Needed

```ts
Object.setPrototypeOf(this, new.target.prototype);
```

Without it, when TypeScript compiles a class extending the native `Error` down to older JavaScript targets, the constructor can break the prototype link between an instance and its actual subclass, causing `err instanceof AppError` (and therefore `err instanceof NotFoundError`, etc.) to evaluate to `false` at runtime, so `errorHandler` would fall through to the generic `500` branch for every custom error instead of returning its correct status code.
