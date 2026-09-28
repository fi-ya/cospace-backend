## Summary
Replace in-memory booking storage with Prisma-backed MySQL persistence and document setup, migration, and verification workflows.

## What Was Done
- Added Prisma 7.10.0 MySQL configuration, CoSpace Prisma models, the initial migration baseline, and a shared Prisma Client configured with the MariaDB adapter.
- Replaced the booking repository's in-memory array operations with Prisma queries for listing, lookup, pagination, counting, creation, update, and deletion.
- Propagated asynchronous database operations through the booking service, controllers, and routes.
- Aligned booking validation and API types with the database fields: numeric IDs, `user_id`, `desk_id`, and ISO `booking_date`.
- Added documentation for Prisma persistence, refactoring repository storage, creating or safely reusing a MySQL database, and adopting Prisma Migrate without resetting existing data.
- Added Prisma agent skill references and configuration for the supported coding tools.

**Security note:** Booking creation currently accepts `user_id` in the request body. The existing auth middleware does not identify the authenticated user; derive `user_id` from trusted authentication context before production use.

## How to Test
Run from the repository root with `.env` pointing at a disposable development database:

```sh
npx prisma validate
npx prisma generate
npx tsc --noEmit
npx prisma migrate status
npm run dev
```

Manually exercise paginated listing and booking CRUD using valid database user and desk IDs. Verify duplicate desk/date and invalid foreign-key bookings are rejected, and confirm records persist after restarting the API. Do not run migrations against a database containing valuable data unless its migration history has been safely baselined. The current `npm test` script is a placeholder, so automated persistence tests are not yet available.
