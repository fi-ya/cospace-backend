# Set Up a New CoSpace MySQL Database

Use this guide to create a clean MySQL database for CoSpace and point the API at it. It also explains how to clear the CoSpace tables from an existing **disposable development database**. The table-drop steps permanently delete data; use a new database when the existing database contains anything you need to keep.

## Prerequisites

- MySQL 8.x is running and you can connect with an account allowed to create databases and tables.
- Prisma dependencies and `prisma.config.ts` are set up in this repository.
- `prisma/schema.prisma` contains the CoSpace models and matches the SQL migrations.
- You are running commands from the repository root.

The schema contains `teams`, `users`, `desks`, `rooms`, and `bookings`. Bookings depend on users and desks; users depend on teams.

## 1. Prefer a Separate Development Database

Keeping the old database intact is the safest way to start clean. Connect to MySQL:

```sh
mysql -u root -p
```

At the MySQL prompt, create a new database. Use a different name if `cospace_dev` already exists:

```sql
CREATE DATABASE cospace_dev;
SHOW DATABASES;
USE cospace_dev;
SELECT DATABASE();
```

Confirm `SELECT DATABASE()` reports the new development database before continuing. Do not use a production or shared database for this exercise.

## 2. If You Must Reuse a Database That Has Tables

Only do this when you have confirmed that the selected database is disposable and you are willing to lose its data. Dropping tables cannot be undone with `ROLLBACK`.

First, back up the database from another terminal. This example writes a dump file in the repository directory; store it securely and do not commit it:

```sh
mysqldump -u root -p cospace > cospace-backup.sql
```

Connect to MySQL and verify the exact target before dropping anything:

```sql
USE cospace;
SELECT DATABASE();
SHOW TABLES;
```

If the selected database is not the disposable target, stop. Once verified, drop the CoSpace child tables before their parent tables. The final statement clears Prisma's migration ledger if it exists, so Prisma can be initialized against the clean schema again:

```sql
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS desks;
DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS teams;
DROP TABLE IF EXISTS _prisma_migrations;
SHOW TABLES;
```

Inspect `SHOW TABLES` first and decide separately what to do with any other tables; the statements above intentionally name only CoSpace tables and Prisma's migration ledger. Do not disable foreign-key checks to force a drop. If this is a production, shared, or otherwise valuable database, do not run these statements; create a separate database instead.

## 3. Create or Select the Database

For a completely new database, connect with MySQL if needed and create it:

```sql
CREATE DATABASE cospace;
USE cospace;
SELECT DATABASE();
```

If using the newly created `cospace_dev`, select that database instead. Prisma Migrate creates tables from `prisma/schema.prisma`; creating the database itself remains a MySQL step.

## 4. Point the API at the Selected Database

In the repository-root `.env`, set `DATABASE_URL` to the database you just created or selected. Keep the real credentials private and make sure `.env` remains ignored by Git:

```dotenv
DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/cospace"
```

For `cospace_dev`, change the final path to `/cospace_dev`. URL-encode special characters in the username or password. Confirm this URL targets the intended development database before running Prisma commands.

The Prisma CLI reads the URL through `prisma.config.ts`; the API's shared Prisma client loads `.env` and uses the MySQL adapter. Keep Prisma CLI, `@prisma/client`, and the adapter on compatible versions.

## 5. Create and Apply the Prisma Migration

For a new or intentionally cleared database, use Prisma Migrate to create and apply the schema from `prisma/schema.prisma`. This makes Prisma the source of truth for future schema changes instead of manually applying the handwritten SQL migration files.

Validate that the schema contains the five CoSpace models and matches the intended database fields and constraints:

```sh
npx prisma validate
```

If `prisma/migrations/` has no migration history yet, create and apply the initial migration:

```sh
npx prisma migrate dev --name init
npx prisma generate
```

If Prisma migrations already exist in `prisma/migrations/`, keep that history and apply pending migrations with `npx prisma migrate dev`; do not create a second unrelated initial migration. Check the result with:

```sh
npx prisma migrate status
```

Prisma should create `teams`, `users`, `desks`, `rooms`, and `bookings`, including their foreign keys and unique constraints. Do not also run `SOURCE migrations/001_init_schema.up.sql` or `SOURCE migrations/002_add_indexing.up.sql` against the same database; those handwritten SQL files describe the same schema and would conflict with Prisma-managed history.

Keep the SQL migration files as the original database-module history and reference. Do not edit already-applied SQL or Prisma migrations; make future schema changes by updating `prisma/schema.prisma` and creating a new Prisma migration.

## 6. Optionally Load Development Sample Data

Only run this against a disposable development database. The script begins by deleting rows from the existing CoSpace tables, then inserts sample data and runs example `UPDATE` and `DELETE` statements. Its final example deletes Desk 3, which cascades to bookings for that desk. The script starts with `USE cospace;`, so it always targets the database named `cospace`, even if another database is selected or `DATABASE_URL` points to `cospace_dev`. Do not run it unless `cospace` is the intended disposable target; for another database, make a reviewed development-only copy with the `USE` statement changed to that database name.

```sql
SOURCE scripts/seed_and_queries.sql;
```

Skip this step if you want an empty database or are working with data that must be preserved.

## 7. Baseline an Existing Database (Existing Tables Only)

Use this path only when the selected database already contains tables created by the handwritten SQL migrations and you want to adopt Prisma Migrate without dropping those tables or their data. For a new or deliberately cleared database, use Step 5 instead.

Because these tables were created outside Prisma, Prisma does not automatically know that schema history. After confirming `prisma/schema.prisma` matches the live tables, create a baseline file:

```sh
mkdir -p prisma/migrations/0_init
npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script > prisma/migrations/0_init/migration.sql
```

Review the generated SQL. It represents table creation and must not be executed against the database where the tables already exist. Then record that initial state as already applied:

```sh
npx prisma migrate resolve --applied 0_init
npx prisma migrate status
```

`migrate resolve` updates Prisma's migration history; it does not create tables or delete data. After the baseline, use Prisma Migrate for future schema changes. Do not run `npx prisma migrate dev` before baselining this SQL-created database: Prisma may report drift and offer a destructive reset.

## 8. Verify the Setup

Run from the repository root:

```sh
npx prisma validate
npx prisma generate
npx prisma migrate status
npx tsc --noEmit
```

Then check in MySQL that the selected database and tables are correct:

```sql
SELECT DATABASE();
SHOW TABLES;
SELECT COUNT(*) FROM bookings;
```

If sample data was loaded, `bookings` should contain rows unless the seed script's demonstration changes were subsequently altered. Start the API with `npm run dev` and exercise booking reads against that database. A restart should not remove rows because they now persist in MySQL.

## Recovery Notes

- If Prisma reports drift and asks to reset, cancel. Check the URL, schema, and migration history; do not reset to make the warning disappear.
- If `migrate resolve` says the baseline is already recorded, inspect `prisma migrate status` before changing the migration ledger.
- If the migration SQL fails, stop and inspect the MySQL error and current tables before retrying. Do not repeatedly run migrations against a partially created schema.
- For the full in-memory repository refactor steps, see [Refactor In-Memory Booking Storage to MySQL](refactor-in-memory-to-exisiting-msql-db.md).

## References

- [MySQL schema and setup](../README.md)
- [Initial schema migration](../migrations/001_init_schema.up.sql)
- [Desk/date unique constraint migration](../migrations/002_add_indexing.up.sql)
- [Development seed and query script](../scripts/seed_and_queries.sql)
- [Prisma and MySQL persistence notes](persistence-prisma.md)

