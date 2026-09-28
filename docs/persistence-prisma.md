# Prisma and MySQL Persistence

This guide describes the Prisma 7 setup for the CoSpace backend and the steps to replace the in-memory booking repository. It uses the existing MySQL database and the domain model in `.github/copilot-instructions.md`.

## 1. Install Prisma

Run these commands from the repository root:

```sh
npm install -D prisma@7.10.0
npm install @prisma/client@7.10.0 @prisma/adapter-mariadb@7.10.0 dotenv
npx prisma init --datasource-provider mysql
```

The commands above pin the Prisma CLI, Client, and MySQL adapter to the same version. During this setup, `prisma@prev` resolved to Prisma `7.10.0`; `prev` is a mutable npm dist-tag, not a synonym for "preview", so use an explicit version for repeatable installs.

Prisma 7 uses a MySQL driver adapter at runtime. The `prisma` package provides the CLI; `@prisma/client` provides the client runtime and types; `@prisma/adapter-mariadb` connects that client to MySQL using its `mariadb` driver dependency; and `dotenv` loads local environment values in the application process. The MariaDB driver is installed transitively by the adapter.

![Diagram showing API requests flowing through the booking repository and Prisma Client to a MySQL adapter connection pool, with DATABASE_URL loaded from .env by dotenv.](./images/prisma-setup.svg)


The initializer creates `prisma/schema.prisma`, `prisma.config.ts`, and `.env`. Prisma CLI expects the config filename `prisma.config.ts`; a custom name such as `prisma7.config.ts` is not auto-discovered. This project's config uses Prisma's `env("DATABASE_URL")` helper so a missing connection string fails clearly. Prisma 6 tutorials use a different generator and put the datasource URL in `schema.prisma`.

## 2. Configure the database URL

Keep credentials in `.env`, which must be ignored by Git. Commit only a matching `.env.example` with placeholders. Add this to `.env` and replace the username and password with the MySQL account created for this project:

```dotenv
DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/cospace-dev"
```

URL-encode special characters in the username or password. The database must already exist. The repo's [README setup](../README.md) describes creating `cospace` and applying the SQL migrations. The application should fail at startup if `DATABASE_URL` is missing; do not add a fallback credential.

In the repository-root `prisma.config.ts`, load the environment and configure Prisma CLI to use the schema and migration directory:

```ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
	schema: "prisma/schema.prisma",
	migrations: {
		path: "prisma/migrations",
	},
	datasource: {
		url: env("DATABASE_URL"),
	},
});
```

## 3. Model the existing tables

The generated `prisma/schema.prisma` currently contains only the MySQL datasource and client generator; it does not yet define models. Add the CoSpace models using the exact fields and map them to the existing plural SQL table names. The intended model definitions are:

```prisma
generator client {
	provider = "prisma-client"
	output   = "../src/generated/prisma"
}

datasource db {
	provider = "mysql"
}

model Team {
	id         Int     @id @default(autoincrement())
	name       String  @unique @db.VarChar(100)
	department String  @db.VarChar(100)
	users      User[]

	@@map("teams")
}

model User {
	id         Int       @id @default(autoincrement())
	first_name String    @db.VarChar(100)
	last_name  String    @db.VarChar(100)
	email      String    @unique @db.VarChar(191)
	password   String    @db.VarChar(255)
	team_id    Int?
	team       Team?     @relation(fields: [team_id], references: [id], onDelete: SetNull)
	bookings   Booking[]

	@@map("users")
}

model Desk {
	id       Int       @id @default(autoincrement())
	name     String    @unique @db.VarChar(100)
	floor    Int
	bookings Booking[]

	@@map("desks")
}

model Room {
	id       Int    @id @default(autoincrement())
	name     String @unique @db.VarChar(100)
	floor    Int
	capacity Int

	@@map("rooms")
}

model Booking {
	id           Int      @id @default(autoincrement())
	user_id      Int
	desk_id      Int
	booking_date DateTime @db.Date
	active       Boolean  @default(true)
	user         User     @relation(fields: [user_id], references: [id], onDelete: Cascade)
	desk         Desk     @relation(fields: [desk_id], references: [id], onDelete: Cascade)

	@@unique([desk_id, booking_date], map: "uniq_desk_date")
	@@unique([user_id, desk_id, booking_date], map: "uq_user_desk_date")
	@@map("bookings")
}
```

The existing `001_init_schema.up.sql` also creates `uq_user_desk_date`, a redundant unique constraint on `(user_id, desk_id, booking_date)`. It is included above so Prisma matches databases created from the current SQL migrations. If removing this redundant constraint to match the intended domain rules, do so with a deliberate forward migration and remove the corresponding `@@unique`; do not edit an SQL migration that has already been applied.

`booking_date` is a MySQL `DATE`, represented by Prisma as a JavaScript `Date`. Keep the API's date contract as an ISO calendar date (`YYYY-MM-DD`) and convert at the repository boundary; avoid formatting dates in the API.

## 4. Generate the client and choose a migration path

Validate the schema and generate the TypeScript client:

```sh
npx prisma validate
npx prisma generate
```

Choose exactly one of the following paths for the current database state.

### Empty database

If `cospace` exists but has no tables, create the first migration from the Prisma schema and apply it:

```sh
npx prisma migrate dev --name init_users_and_bookings

```

Do not also run `migrations/001_init_schema.up.sql` and `migrations/002_add_indexing.up.sql` against this database; that would try to create the same tables again. Keep the existing SQL files as historical material, and use Prisma migrations as the schema-change workflow going forward.

## 5. Create one Prisma client for the API

Create `src/utils/prisma.ts`. Prisma 7 uses the driver adapter for runtime connections; this configuration builds the adapter from the same required `DATABASE_URL` used by the CLI:

```ts
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
	throw new Error("DATABASE_URL is required");
}

const databaseUrl = new URL(connectionString);
const databaseName = decodeURIComponent(databaseUrl.pathname.slice(1));
if (!databaseName) {
	throw new Error("DATABASE_URL must include a database name");
}

const adapter = new PrismaMariaDb({
	host: databaseUrl.hostname,
	port: Number(databaseUrl.port || 3306),
	user: decodeURIComponent(databaseUrl.username),
	password: decodeURIComponent(databaseUrl.password),
	database: databaseName,
	connectionLimit: 5,
});

export const prisma = new PrismaClient({ adapter });
```

Import this singleton from repositories; do not create a new `PrismaClient` for every request. On process shutdown, call `await prisma.$disconnect()` after the HTTP server stops accepting requests.

## 6. Replace the in-memory booking repository

The current `BookingRepository` methods are synchronous and operate on an array. Replace those operations with Prisma model calls and make repository and service methods asynchronous. For example, use `prisma.booking.findMany({ skip, take })` for a page, `prisma.booking.count()` for the total, `findUnique({ where: { id } })` for a lookup, and the corresponding `create`, `update`, and `delete` model operations for writes. Run the page query and count together with `Promise.all` where appropriate.

Update the controller to await service results and pass rejected promises to the existing error middleware. Preserve the pagination response shape and translate Prisma errors into the project's standard error responses; do not return raw database errors to clients.

### Reconcile the booking API before writes

The current API schema accepts `desk`, `floor`, and `date`, while the database requires `user_id`, `desk_id`, and `booking_date`. The current auth middleware also checks a fixed token and does not identify the signed-in user. A create operation cannot safely invent a user or desk ID. Before replacing create/update, align the validated request and authenticated user context with the required database relationships. Use real existing user and desk records when testing; do not trust a caller-supplied user ID as proof of identity.

After wiring the repository, verify `GET /bookings` and pagination against seeded rows, then test create, update, cancellation, and delete using valid related records. Also test duplicate desk/date and missing foreign-key cases. The database constraints should prevent invalid or double-booked rows even if application validation is bypassed.

## References

- [MySQL schema and setup](../README.md)
- [Initial SQL migration](../migrations/001_init_schema.up.sql)
- [Desk/date unique constraint migration](../migrations/002_add_indexing.up.sql)
- [Prisma MySQL documentation](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/mysql)
- [Prisma baselining documentation](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/baselining)



--- 

### Existing database created by the SQL migrations

Do not run `migrate dev` directly against this database. Prisma has no migration history for the existing SQL files, so first create and mark a baseline migration as already applied:

```sh
mkdir -p prisma/migrations/0_init
npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script > prisma/migrations/0_init/migration.sql
npx prisma migrate resolve --applied 0_init
npx prisma migrate status
```

Before marking the baseline applied, confirm that the Prisma schema represents the actual database. `migrate resolve` records the baseline; it does not execute the generated SQL against the existing tables. After baselining, use Prisma migrations for future schema changes instead of applying new SQL changes outside Prisma.