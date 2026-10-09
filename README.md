# CoSpace Backend

CoSpace is BrightMedia's hybrid-office desk booking database. This repository currently contains the MySQL schema migrations, seed data, and reporting queries used to build and practise the database layer.

The Express API is not implemented yet. `server.js` is retained as the future application entry point.

## Requirements

- MySQL 8.x
- A MySQL user with permission to create and alter tables in the `cospace` database

## Environment Variables

Copy `.env.example` to `.env` in the repository root, then fill in values for your local environment:

```sh
cp .env.example .env
```

- `DATABASE_URL` is the MySQL connection URL used by Prisma and the API.
- `JWT_SECRET` is a long, randomly generated secret used to sign authentication tokens. The application fails to start if it is missing; it has no fallback value.

Keep real credentials and secrets in `.env` only. `.env` is ignored by Git; commit changes to `.env.example` only when environment variable names change, and do not put working credentials in it.

## Database Schema

The schema is made up of five tables:

- `teams`: organisational teams and departments
- `users`: colleagues and their optional team assignment
- `desks`: physical desks and their floor numbers
- `rooms`: meeting rooms, floors, and capacities
- `bookings`: desk reservations linked to a user and desk

Foreign keys preserve referential integrity. Deleting a user or desk cascades to their bookings; deleting a team sets the related users' `team_id` to `NULL`.

Migration 002 adds the `uniq_desk_date` constraint on `(desk_id, booking_date)`, preventing two colleagues from booking the same desk on the same day.

## Setup

Open terminal and cd into the workspace directory.

Start a mysql client 
```zsh
mysql -u root
```

To view existing databases run: `SHOW DATABASES;`
Create the database first because the migration files create tables but do not create the database itself:

```sql
CREATE DATABASE cospace;
```
To view current database run: `SELECT DATABASE();`

Apply the migrations in order from the repository root:

```bash
SOURCE migrations/001_init_schema.up.sql
SOURCE migrations/002_add_indexing.up.sql
```

Load the sample data and reporting queries:

```bash
SOURCE scripts/seed_and_queries.sql
```

The seed script starts by clearing the existing `bookings`, `users`, `desks`, `rooms`, and `teams` rows. It also includes example update and delete statements, so use it only against a development database.

## Rolling Back

Undo migration 002 before migration 001:

```bash
SOURCE migrations/002_add_indexing.down.sql
SOURCE migrations/001_init_schema.down.sql
```

## Repository Layout

```text
.
├── migrations/
│   ├── 001_init_schema.up.sql
│   ├── 001_init_schema.down.sql
│   ├── 002_add_indexing.up.sql
│   └── 002_add_indexing.down.sql
├── scripts/
│   └── seed_and_queries.sql
└── docs/
	├── schema.md
	├── tables.md
	├── query.md
	└── git-journal.md
```

`docs/` contains the schema notes, SQL practice exercises, migration PR descriptions, and Git learning journal.

## Verification Queries

After seeding, inspect the schema and sample data with:

```sql
USE cospace;
SHOW TABLES;
SELECT * FROM bookings;
```

The reporting query in `scripts/seed_and_queries.sql` uses `LEFT JOIN` and `COUNT(b.id)` so colleagues with no bookings are included with a count of zero.
