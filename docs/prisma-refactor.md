# Prisma Booking Persistence Refactor

The booking feature now uses Prisma for persistent storage instead of an in-memory array. The repository, service, controller, routes, and request schemas were updated together to match the Prisma `Booking` model and asynchronous database operations.

## Changes by file

### `src/repositories/booking.repository.ts`

- Replaced the in-memory array with `prisma.booking` queries.
- Implemented `findAll`, `findPaginated`, `findById`, `count`, `create`, `update`, and `delete`.
- List queries have stable ordering by `booking_date` then `id`; pagination uses Prisma `skip` and `take`.
- Converts `YYYY-MM-DD` values to UTC `Date` values for database writes, and defaults `active` to `true` on creation.
- Returns `undefined` when update or delete finds no record (`P2025`); other Prisma errors are rethrown.

### `src/services/booking.service.ts`

- Updated repository-facing methods to return promises and Prisma booking types.
- Fetches the total count and requested page concurrently, then builds the pagination metadata.
- Delegates create, update, and delete operations to the repository using the schema input types.

### `src/controllers/booking.controller.ts`

- Awaits service operations and forwards rejected operations to Express error handling with `next`.
- Parses route IDs as positive integers and returns a bad-request error for invalid IDs.
- Keeps list pagination defaults at 10 items per page and caps the limit at 50.
- Returns not-found errors for missing bookings and preserves the existing create, read, update, activation toggle, and delete responses.

### `src/routes/booking.routes.ts`

- Updated POST and PUT handler types to use the Prisma booking response and the create/update input types.
- Validates POST bodies with the create schema and PUT bodies with the partial update schema.
- Retains the existing authentication middleware on write routes.

### `src/schemas/booking.schema.ts`

- Replaced display-only fields (`desk`, `floor`, and `date`) with `user_id`, `desk_id`, and `booking_date` to match the database model.
- Validates positive integer foreign keys and an ISO calendar date; `active` defaults to `true` for creation.
- Added a partial update schema and input types that represent the accepted request bodies.

## Integration note

The current fixed-token authentication middleware does not provide an authenticated user ID. Therefore, booking creation currently accepts `user_id` in the validated request body; a user-aware authentication flow should derive this value from authenticated request context instead.










