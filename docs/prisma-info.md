# Prisma Setup

This repository uses Prisma ORM 7.10 with MySQL and the MariaDB driver adapter. Prisma is already initialized here; do not rerun `prisma init` in this repository.

## Installed packages

The Prisma CLI and client versions are pinned to the same release. The adapter and `dotenv` are application dependencies because the running API uses them.

```bash
npm install --save-dev prisma@7.10.0
npm install @prisma/client@7.10.0 @prisma/adapter-mariadb@7.10.0 dotenv
```

## Database connection

Set `DATABASE_URL` in the ignored `.env` file. The committed `.env.example` contains a placeholder connection string.

```env
DATABASE_URL="mysql://cospace_user:your_password@localhost:3306/cospace-dev"
```

Use the database account and database name configured on your machine. Percent-encode special characters in the username or password when placing them in the URL. Do not commit `.env` or real credentials.

The CLI reads this value in `prisma7.config.ts`. The runtime Prisma client reads the same value in `src/utils/prisma.ts` and parses it into the MariaDB adapter options. Keep one connection string rather than maintaining separate `MYSQL_*` variables that could disagree with the CLI configuration.

The CLI config loads `dotenv/config`, points to `prisma/schema.prisma`, uses `prisma/migrations`, and passes `DATABASE_URL` to Prisma.

## Schema and generated client

The CoSpace models are already defined in `prisma/schema.prisma`: `Team`, `User`, `Desk`, `Room`, and `Booking`. The schema maps them to the existing plural MySQL table names. `Booking` uses `user_id`, `desk_id`, `booking_date`, and `active`; its date is a MySQL `DATE` represented as a JavaScript `Date` by Prisma. The API uses `YYYY-MM-DD` and converts dates at the repository boundary.

The schema's generator is configured as follows:

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}
```

Regenerate the client after changing the Prisma schema:

```bash
npx prisma generate
```

## Runtime client

`src/utils/prisma.ts` creates the shared client using the MariaDB adapter. It fails during startup if `DATABASE_URL` is missing.

```ts
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import dotenv from "dotenv";
import { PrismaClient } from "../generated/prisma/client";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const connection = new URL(databaseUrl);
const adapter = new PrismaMariaDb({
  host: connection.hostname,
  port: Number(connection.port || 3306),
  user: decodeURIComponent(connection.username),
  password: decodeURIComponent(connection.password),
  database: decodeURIComponent(connection.pathname.slice(1)),
});

export const prisma = new PrismaClient({ adapter });
```

## Verify the setup

These commands validate configuration and generated types without applying a migration:

```bash
npx prisma validate
npx prisma generate
npx prisma migrate status
npx tsc --noEmit --pretty false
```

`prisma migrate status` checks the database connection and compares the local migration history with the database. In the checked setup, migration status reported the schema up to date, and a read-only `SELECT 1` through the application client succeeded.

## Migrations

This repository already has a migration at `prisma/migrations/20260929211433_init_users_and_bookings/`. For a new local database, use `npx prisma migrate dev` to apply the committed migrations and create the migration table. For a schema change, review the generated migration before applying it. `migrate dev` changes the database; do not use it merely to regenerate the client, and do not reset an existing database to fix a connection problem.

`prisma generate` updates generated client code; it does not change the database. A migration updates the database; it does not replace client generation.

To connect with the MySQL command-line client, use:

```bash
mysql -h localhost -u cospace_user -p cospace-dev
```

