# First-Time Prisma Setup

This guide is for setting up Prisma when you first clone this CoSpace backend repository on a development machine. The repository already contains the Prisma schema, Prisma 7 config, generated-client settings, and an initial migration. Do not run `prisma init` or recreate the models.

## Prerequisites

- Node.js 20 and npm
- MySQL 8 running locally, or access to a MySQL database
- A MySQL account allowed to create and alter tables in the target database

## 1. Install project dependencies

From the `cospace-backend` repository root, install the locked dependencies:

```bash
npm ci
```

The lockfile installs Prisma CLI, Prisma Client, the MariaDB driver adapter, and `dotenv` at versions compatible with this repository. Do not install another Prisma major version or a different adapter.

## 2. Create a local MySQL database and account

Connect as a MySQL administrator. For a new local development database, create a database and an application account. Choose your own password and keep it private.

```bash
mysql -u root -p
```

At the MySQL prompt, run:

```sql
CREATE DATABASE cospace_dev;
CREATE USER 'cospace_app'@'localhost' IDENTIFIED BY 'replace_with_a_local_password';
GRANT ALL PRIVILEGES ON cospace_dev.* TO 'cospace_app'@'localhost';
```

If the database or account already exists, do not recreate it; verify that it is the intended development database and the account has the required privileges. These example names are local setup choices, not fixed application requirements.

## 3. Configure the connection string

Copy the example environment file and edit the local copy:

```bash
cp .env.example .env
```

Set `DATABASE_URL` in `.env` to the account and database you created:

```env
DATABASE_URL="mysql://cospace_app:replace_with_a_local_password@localhost:3306/cospace_dev"
```

Replace the example credentials and database name. Percent-encode special characters in the username or password before placing them in the URL. Keep real credentials in `.env`; `.env` is ignored by Git. Do not commit it or paste its contents into logs or chat.

The Prisma CLI reads `DATABASE_URL` from `prisma7.config.ts`. The application reads the same value in `src/utils/prisma.ts` and parses it into the MariaDB adapter options. Use this single connection string for both; do not maintain separate `MYSQL_*` settings.

## 4. Validate the schema and generate Prisma Client

Run these from the repository root:

```bash
npx prisma validate
npx prisma generate
```

The schema is `prisma/schema.prisma`. It already defines `Team`, `User`, `Desk`, `Room`, and `Booking`; the generated client is written to `src/generated/prisma`. Run `prisma generate` again whenever the schema changes. Generation updates client code, not the database.

## 5. Apply the existing migration

This repository includes an initial migration under `prisma/migrations/`. On a newly created, empty development database, apply the committed migration history with:

```bash
npx prisma migrate deploy
```

This command changes the target database by creating the tables and migration tracking table. Confirm that `DATABASE_URL` points to the intended local database before running it. Do not use `migrate reset` to troubleshoot setup, and do not use `migrate dev` just to generate the client.

For later schema changes made during development, use `npx prisma migrate dev --name <descriptive-name>` after reviewing the schema change and confirming the selected database. `migrate dev` creates and applies a migration and may use a shadow database; the MySQL account may need additional privileges for that workflow.

## 6. Verify the database and TypeScript setup

After applying the migration, run:

```bash
npx prisma migrate status
npx tsc --noEmit --pretty false
```

Migration status should report that the database schema is up to date. The TypeScript check should finish without errors.

## 7. Start the API

Start the backend development server:

```bash
npm run dev
```

The server listens on port `5000`. In another terminal, check its health endpoint:

```bash
curl http://localhost:5000/
```

It should return a JSON response with `status` set to `active`. The Prisma client is shared by the API, and startup requires `DATABASE_URL` to be set.

## Optional: Open Prisma Studio

To inspect the configured database in a browser, run:

```bash
npx prisma studio
```

Confirm `DATABASE_URL` points at the intended database before editing records in Studio.

## Seeding note

Do not use `scripts/seed_and_queries.sql` as a first-time seed script without updating it first. It hard-codes `USE cospace`, deletes rows from all domain tables, and inserts users without the required `password` value. The database can be set up and the API started without running that script.

