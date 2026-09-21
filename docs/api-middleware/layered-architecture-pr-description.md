# PR: refactor/layered-architecture

## Summary

Refactor the CoSpace booking API into a layered architecture with separate repository, service, controller, and routing responsibilities. The API keeps its existing booking endpoints while isolating storage, business validation, HTTP response handling, and route mapping.

## What Was Done

- Added `BookingRepository` to own the in-memory booking array and expose:
  - `findAll()`
  - `findById(id)`
  - `create(booking)`
  - `update(id, data)`
  - `delete(id)`
- Added `BookingService` to sit between controllers and the repository.
- Added business validation in the service layer requiring desk names to be at least three characters long.
- Added `BookingController` to:
  - Extract route parameters and request bodies.
  - Call service methods with framework-independent data.
  - Convert missing resources into `404` responses.
  - Convert service validation errors into `400` responses.
  - Return `201`, `200`, and `204` responses for successful operations.
- Replaced implementation-heavy routes with `src/routes/booking.routes.ts`, which only maps methods and paths to controller handlers.
- Used wrapper arrow functions when registering controller methods so the controller instance context is preserved.
- Mounted the booking router at `/bookings` and restored `express.json()` middleware in `src/index.ts`.
- Kept HTTP concerns out of the service and repository layers, allowing the in-memory repository to be replaced by a database implementation later.
- Added layered architecture and scaffold documentation under `docs/api-middleware/`.

## Endpoints

- `GET /bookings`
- `GET /bookings/:id`
- `POST /bookings`
- `PUT /bookings/:id`
- `PATCH /bookings/:id`
- `DELETE /bookings/:id`

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

Verify the collection route:

```bash
curl -i http://localhost:5000/bookings
```

Verify successful creation:

```bash
curl -i -X POST http://localhost:5000/bookings \
  -H 'Content-Type: application/json' \
  -d '{"id":"4","desk":"Desk-04","floor":2,"date":"2026-09-24","active":true}'
```

Verify service validation and controller error handling:

```bash
curl -i -X POST http://localhost:5000/bookings \
  -H 'Content-Type: application/json' \
  -d '{"id":"5","desk":"AB","floor":2,"date":"2026-09-25","active":true}'
```

Expected response:

```json
{
  "error": "Desk name must be at least 3 characters long"
}
```

Expected status: `400 Bad Request`.

Verify lookup, update, toggle, and delete behavior:

```bash
curl -i http://localhost:5000/bookings/2

curl -i -X PUT http://localhost:5000/bookings/1 \
  -H 'Content-Type: application/json' \
  -d '{"id":"1","desk":"Desk-09","floor":3,"date":"2026-09-30","active":true}'

curl -i -X PATCH http://localhost:5000/bookings/2

curl -i -X DELETE http://localhost:5000/bookings/3
```

The delete request should return `204 No Content`, and an unknown booking ID should return `404` with `{ "error": "Booking not found" }`.
