## Summary
Add JWT-based authentication and Prisma/MySQL persistence for CoSpace users and bookings, replacing in-memory booking storage with database-backed operations.

## What Was Done
- Added bcrypt password hashing/comparison helpers and JWT sign/verify helpers that require `JWT_SECRET` and never use a fallback signing key.
- Added registration and login endpoints under `/auth`, with Zod validation, Prisma-backed user lookup/creation, hashed password storage, and responses that omit password hashes.
- Added `requireAuth` middleware to verify Bearer JWTs and attach the verified `{ userId, email }` payload to `req.user`.
- Updated booking write routes to use JWT authentication and derive booking ownership from the authenticated user. The client no longer supplies `user_id`; the repository connects the Prisma `user` relation.
- Replaced in-memory booking CRUD and pagination with Prisma queries and asynchronous controller/service handling.
- Added Prisma 7.10 MySQL configuration, CoSpace models, the initial schema migration, and `.env.example` with `DATABASE_URL` and `JWT_SECRET` names only.
- Added setup, migration, persistence, and authentication notes, plus Prisma agent guidance files.

## How to Test
Configure `.env` with a development `DATABASE_URL` and a strong `JWT_SECRET`, then run:

```sh
npx prisma validate
npx prisma generate
npx prisma migrate status
npx tsc --noEmit
npm run dev
```

Use the HTTP examples in `prisma/request.http` to register a user, log in, and create a booking with the returned JWT. Verify that the created booking is associated with the authenticated user, not a request-body `user_id`. Also test invalid credentials, duplicate email registration, missing/invalid/expired tokens, invalid desk IDs, and duplicate desk/date bookings.

The existing `npm test` script is a placeholder, so automated auth and persistence tests are not included yet. Apply migrations only to the intended development database; do not reset a database containing data you need to keep. Existing databases with migration drift require reconciliation before using `migrate dev`.
