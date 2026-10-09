# Legacy SQL Database Setup

This guide preserves the earlier manual MySQL setup for the SQL migration, seed-data, and reporting-query exercises. It uses the root-level `migrations/` and `scripts/` directories, not the current Prisma migration history in `prisma/migrations/`.

> This legacy schema is not the Prisma-backed API schema. Do not use this database as the API's `DATABASE_URL` target. The legacy `users` table does not have the `password` column required by the current Prisma schema.

## Requirements

- MySQL 8.x running locally
- A MySQL account allowed to create databases and tables
- Run the MySQL client from the repository root so the `SOURCE` paths resolve

## Create and Migrate the Database

Open a MySQL client from the repository root:

```bash
mysql -u root -p
```

Create and select the legacy database:

```sql
CREATE DATABASE cospace;
USE cospace;
```

Apply the SQL migrations in order:

```sql
SOURCE migrations/001_init_schema.up.sql
SOURCE migrations/002_add_indexing.up.sql
```

Migration 001 creates the teams, users, desks, rooms, and bookings tables. Migration 002 adds the unique `(desk_id, booking_date)` constraint that prevents desk double-bookings.

## Load Sample Data and Queries

Run the seed and reporting script from the same MySQL client:

```sql
SOURCE scripts/seed_and_queries.sql
```

The script clears rows from the existing tables before inserting sample data. It also runs example `UPDATE` and `DELETE` statements, including deleting a desk and its related bookings. Use it only with this legacy development database.

## Verify

```sql
SHOW TABLES;
SELECT * FROM bookings;
```

The script's reporting queries demonstrate joins, grouping, and counting bookings, including colleagues with no bookings.

## Roll Back

Undo migration 002 before migration 001:

```sql
SOURCE migrations/002_add_indexing.down.sql
SOURCE migrations/001_init_schema.down.sql
```