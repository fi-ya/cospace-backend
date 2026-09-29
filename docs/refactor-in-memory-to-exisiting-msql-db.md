# Refactor In-Memory Booking Storage to MySQL

This guide describes the booking-persistence refactor in this Express + TypeScript API. The target stack is Prisma 7.10 with MySQL, using the existing CoSpace tables and migrations. Keep the HTTP layer, service, and repository responsibilities separate: controllers handle HTTP, services coordinate operations, and the repository owns database queries.

## 1. Check the Starting Point

The in-memory implementation stores sample records in `src/repositories/booking.repository.ts`. Those objects do not match the database: the API used desk/floor labels and string IDs, while MySQL bookings require numeric `user_id` and `desk_id` foreign keys and a `booking_date`.

Before changing code, confirm these prerequisites:

- MySQL is running and the `cospace` database exists.
- The existing SQL migrations have created the `teams`, `users`, `desks`, `rooms`, and `bookings` tables.
- `DATABASE_URL` is set in the ignored `.env` file. Never commit real credentials.
- `prisma/schema.prisma` represents the existing tables, including the unique indexes and foreign-key relationships.
- The Prisma CLI, client, and adapter versions match. This repository currently uses Prisma `7.10.0`.

Do not run `prisma migrate dev` against this already populated database until its existing schema is baselined. Do not accept Prisma's suggested reset unless you deliberately intend to drop all database data.

## 2. Configure One Shared Prisma Client

The project uses `prisma.config.ts` for Prisma CLI configuration. It loads `.env` with `dotenv/config` and provides `DATABASE_URL` to Prisma. The application client lives in `src/utils/prisma.ts` and uses the installed `@prisma/adapter-mariadb` adapter.

Use one exported `PrismaClient` instance for the running API. Load environment values before reading `process.env.DATABASE_URL`, fail if the URL is missing, and do not create a client for each request. In this project's CommonJS TypeScript setup, load dotenv with `import dotenv from "dotenv"; dotenv.config();` in the runtime client module.

The adapter reads host, port, username, password, and database name from the URL. Keep its connection limit modest for local development and tune it only against the database's connection capacity and application concurrency.

## 3. Match the Prisma Schema to MySQL

Define Prisma models for the existing domain tables. Use integer auto-increment primary keys and the database's exact columns and constraints. In particular, `Booking` maps to `bookings` and contains `id`, `user_id`, `desk_id`, `booking_date`, and `active`; it relates to `User` and `Desk`. Map model names to plural SQL tables with `@@map` and preserve the `(desk_id, booking_date)` unique constraint.

The initial SQL migration also creates `uq_user_desk_date` on `(user_id, desk_id, booking_date)`. Represent it in Prisma when matching a database created from both existing SQL migrations. Do not modify an already-applied SQL migration to change its history; remove an unwanted constraint using a new migration.

The API should keep dates as `YYYY-MM-DD` strings. Convert to a UTC `Date` when writing the MySQL `DATE`, and convert Prisma's returned date back to `YYYY-MM-DD` at the repository boundary.

After changing `prisma/schema.prisma`, run:

```sh
npx prisma validate
npx prisma generate
```

`generate` produces the typed client; it does not create or modify database tables. A migration command changes database schema.

## 4. Baseline the Existing Database Safely

The current `cospace` database already contains tables created by the handwritten SQL migrations, but Prisma has no matching migration history yet. If `prisma migrate dev` reports drift and offers a reset, cancel it. Do not use `migrate reset` to solve this state.

Once the Prisma schema accurately describes the live database, generate a baseline SQL file for review:

```sh
mkdir -p prisma/migrations/0_init
npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script > prisma/migrations/0_init/migration.sql
```

Review the generated SQL and compare it with the actual database schema. This file records the schema Prisma will use as its initial migration baseline; it must not be executed against tables that already exist. Then tell Prisma that the baseline is already applied:

```sh
npx prisma migrate resolve --applied 0_init
npx prisma migrate status
```

`migrate resolve` updates Prisma's migration history; it does not create tables or alter booking rows. After baselining, use Prisma migrations for future schema changes rather than applying new schema changes outside Prisma.

For a genuinely empty database only, create and apply the initial Prisma migration instead:

```sh
npx prisma migrate dev --name init
npx prisma generate
```

Do not mix this empty-database path with the baseline path.

## 5. Replace Array Operations with Prisma Queries

Make repository methods asynchronous because Prisma queries return promises. Use the generated model and the shared `prisma` instance:

| Repository operation | Prisma operation | Result to preserve |
|---|---|---|
| `findAll()` | `prisma.booking.findMany({ orderBy: [...] })` | All rows in deterministic order; avoid using this unbounded method for a paginated endpoint. |
| `findById(id)` | `prisma.booking.findUnique({ where: { id } })` | A row or `undefined`. |
| `findPaginated(skip, limit)` | `prisma.booking.findMany({ skip, take: limit, orderBy: [...] })` | Only the requested page in deterministic order. |
| `count()` | `prisma.booking.count()` | Total matching rows for pagination metadata. |
| `create(data)` | `prisma.booking.create({ data })` | The inserted row, including its database-generated ID. |
| `update(id, data)` | `prisma.booking.update({ where: { id }, data })` | The updated row or `undefined` if the ID does not exist. |
| `delete(id)` | `prisma.booking.delete({ where: { id } })` | The deleted row or `undefined` if the ID does not exist. |

For a page, compute `skip = (page - 1) * limit`. `skip` excludes that many rows and `take` limits how many MySQL returns. Apply a stable `orderBy` (for example, `booking_date` then `id`) so page boundaries are predictable. Fetch the page and total count with `Promise.all` when they do not depend on one another.

Translate between the Prisma row and the public response in one repository helper. This is where the Prisma `Date` for `booking_date` should become the API's ISO calendar-date string.

## 6. Align Booking Inputs with the Database

Replace the old `desk`, `floor`, and `date` payload with the fields required to persist a booking: `user_id`, `desk_id`, `booking_date`, and optional `active`. Validate positive integer IDs and a valid ISO calendar date with Zod. The response adds the numeric database-generated `id`.

The database foreign keys require `user_id` and `desk_id` to point to real rows. Do not create substitute IDs or accept a caller-supplied `user_id` as proof of identity. The current auth middleware only checks a fixed token and does not identify a user. Before enabling real booking creation, update authentication to establish the signed-in user and derive `user_id` from that trusted context; let the client select a desk and date, not another user's identity.

## 7. Propagate Async Behavior Upward

Since repository methods return promises, update each caller in order:

1. Make the service methods return promises and await repository work. For paginated results, await the page and count before calculating `totalPages` and building `{ data, meta }`.
2. Make controller handlers `async`, await service results, and route rejected operations to Express error middleware with `next(error)` (or the project's established async error pattern).
3. Parse route IDs as positive integers before calling Prisma. Database IDs are numeric; invalid IDs should produce a `400`, and missing rows should produce a `404`.
4. Keep response status behavior consistent: `201` for create, `200` for reads/updates, and `204` for a successful delete.

Do not return a promise object to `res.json`, and do not assume an asynchronous lookup has completed before checking whether its result exists.

## 8. Handle Database Errors Safely

Database constraints remain the final protection against duplicate desk/date bookings and invalid foreign keys. Handle known Prisma errors at the service or error-middleware boundary and preserve the standard API error shape:

- `P2002` unique-constraint violation: return `400` with a human-readable booking conflict message.
- `P2003` foreign-key violation: return `400` explaining that the supplied user or desk is invalid.
- `P2025` record not found: return `404` for update/delete (or return `undefined` from the repository for the controller to handle).
- Unexpected connection or database errors: return the sanitized `500` response; never expose a database URL, credentials, query, or raw driver message.

Do not convert every database error to `404`; only a missing target record has that meaning.

## 9. Verify the Refactor

Run checks from the repository root:

```sh
npx prisma validate
npx prisma generate
npx tsc --noEmit
npx prisma migrate status
npm run dev
```

Then exercise the API using existing user and desk IDs from the development database. Check that:

- Listing returns only one page and includes correct pagination metadata.
- Page results are consistently ordered; an out-of-range page returns an empty `data` array.
- Lookup, update, cancellation, and deletion work for existing IDs.
- An unknown or malformed ID returns `404` or `400` as appropriate.
- A duplicate desk/date booking and invalid foreign-key IDs are rejected with the standard error shape.
- A booking still exists after restarting the API, proving it is stored in MySQL rather than process memory.
- A create request cannot impersonate another user by sending a different `user_id`.

This repository's `npm test` script is currently a placeholder, so it does not provide automated persistence coverage yet. Add focused repository/API tests with a test database before relying on the refactor in production.

## References

- [Prisma and MySQL setup](persistence-prisma.md)
- [MySQL schema and setup](../README.md)
- [Initial SQL schema migration](../migrations/001_init_schema.up.sql)
- [Desk/date unique constraint migration](../migrations/002_add_indexing.up.sql)
- [Prisma MySQL documentation](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/mysql)
- [Prisma baselining documentation](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/baselining)

