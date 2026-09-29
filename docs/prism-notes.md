# Prisma Setup

We will start by installing Prisma and setting up the initial project structure. Following the docs here: https://www.prisma.io/docs/v7/prisma-orm/quickstart/mysql

## Installing Prisma

### 1. Install Prisma CLI and Prisma Client

prisma - The Prisma CLI for running commands like prisma init, prisma migrate, and prisma generate
@prisma/client - The Prisma Client library for querying your database 
```bash 
npm install -D prisma@7.10.0
npm install @prisma/client@7.10.0 
```

This will initialize a new Prisma project with a MySQL datasource.
```bash
 npx prisma init --datasource-provider mysql
 ```
It will create a:
- `.env` - Environment file to store your database connection URL.
- `prisma/schema.prisma` - The main Prisma schema file where you define your data model and datasource.
- `prisma/migrations/` - Directory where migration files will be stored after running `prisma migrate dev`.
- `src/generated/prisma/` - Directory where the generated Prisma client will be stored.
- `prisma7.config.js` - Configuration file for Prisma 7, used to customize the behavior of the Prisma CLI and client. Allows you to run prisma commands in the terminal with specific configurations.
    - `npm install --save-dev prisma dotenv`

### 2. Configure dotenv in your project.
Install dotenv to manage environment variables as to runtime dependencies as the Prismaclient will need access to them:
```bash
npm install dotenv
```
It is a library that loads environment variables from your `.env` file into `process.env` in Node.js.
After installing, you can use it in your project by requiring and configuring it at the top of your entry file (e.g., `index.js` or `app.js`):

```javascript
require('dotenv').config();
```

### 3. Update the database connection URL in your `.env` file.
update the database connection URL in your `.env` file to match your MySQL database configuration. For example:

```env
DATABASE_URL="mysql://root:password@localhost:3306/cospace-dev"
```

Keep credentials in `.env`, which must be ignored by Git. Commit only a matching `.env.example` with placeholders. Add this to `.env` and replace the username and password with the MySQL account created for this project:

### 4. Define your data model in `prisma/schema.prisma`.
The generated `prisma/schema.prisma` currently contains only the MySQL datasource and client generator; it does not yet define models. Add the CoSpace models using the exact fields and map them to the existing plural SQL table names. The intended model definitions are:

```prisma
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

### 5. Generate the client and choose a migration path

After defining your data model in `prisma/schema.prisma`, validate it with:

```bash
npx prisma validate
```

You can now run the migration command to apply the changes to your database.The migration will create the necessary tables and constraints in your database based on the Prisma schema.
```bash
npx prisma migrate dev --name init_users_and_bookings
```

Output from the migration command will indicate the success of the migration and any SQL statements executed against the database.
```bash
Loaded Prisma config from prisma7.config.ts.

Prisma schema loaded from prisma/schema.prisma.
Datasource "db": MySQL database "cospace-test" at "localhost:3306"

MySQL database cospace-test created at localhost:3306

Applying migration `20260929211433_init_users_and_bookings`

The following migration(s) have been created and applied from new schema changes:

prisma/migrations/
  └─ 20260929211433_init_users_and_bookings/
    └─ migration.sql

Your database is now in sync with your schema.
```

You will see the following files generated in your project:
```
prisma/
  └─ migrations/
    └─ 20260929211433_init_users_and_bookings/
        └─ migration.sql
    └─ migration_lock.toml
```
- prisma/migrations/20260929211433_init_users_and_bookings/migration.sql - Contains the SQL statements for the migration.
- prisma/migrations/migration_lock.toml - Keeps track of the migration state to prevent conflicts and ensure consistency.

You can now start using the Prisma client in your application to interact with the database. Visit Prisma Studio to visually explore and manage your data.
```
npx prisma studio
```

Or you can interact with your database via `mysql` command-line client.

```bash
mysql -u root -p <database_name>
```

### 6. Generate the Prisma client

The next step is to generate the Prisma client which creates the necessary files for interacting with your database. In this repo, the generated files go to src/generated/prisma, as specified by the generator’s output setting. Irrespective of the location, running the command below will generate the client based on the current schema.

```bash
npx prisma generate
```

> The `migration` updates the database; `generate` updates the client code your app imports. They do separate jobs.

### 6a. Add test data for desks, rooms, teams

You can add test data for desks, rooms, and teams by creating a seed script or using Prisma Studio. For example, you can create a `prisma/seed.ts` file and use the Prisma client to insert test data into your database.
or

```sql
-- 1. Seed 3 Teams
INSERT INTO teams (id, name, department) VALUES
(1, 'Creative Studio', 'Marketing'),
(2, 'Platform Engineering', 'Technology'),
(3, 'Corporate Operations', 'HR & Finance');

-- 2. Seed 3 Meeting Rooms
INSERT INTO rooms (id, name, floor, capacity) VALUES
(1, 'Piccadilly', 1, 12),
(2, 'Soho', 2, 6),
(3, 'Westminster', 1, 4);

-- 3. Seed 4 Desks
INSERT INTO desks (id, name, floor) VALUES
(1, 'Desk-01', 1),
(2, 'Desk-02', 1),
(3, 'Desk-03', 2),
(4, 'Desk-04', 2);
```
### 7. Instantiate the Prisma Client

Now that you have all the dependencies installed, we need to instantiate Prisma Client so that we can interact with our database using the generated client. 

we will need to pass an instance of the Prisma ORM driver adapter adapter to the PrismaClient constructor so that it can communicate with the database correctly. Without it, the Prisma Client would not be able to establish a connection to the database as it would lack the necessary information to interact with the underlying database engine.

First, install the MariaDB adapter for Prisma:
```bash
npm install @prisma/adapter-mariadb@7.10.0
```

Validate the Prisma schema and the adapter installation by running the following command:

```bash
npx prisma validate 
```




```ts

import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client";

const adapter = new PrismaMariaDb({
  host: "localhost",
  port: 3306,
  user: process.env.MYSQL_USER!,
  password: process.env.MYSQL_PASSWORD!,
  database: process.env.MYSQL_DATABASE!,
});

export const prisma = new PrismaClient({ adapter });
```

