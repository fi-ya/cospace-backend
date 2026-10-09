# CoSpace Backend

CoSpace is BrightMedia's hybrid-office desk booking API. The backend uses Express, TypeScript, MySQL, and Prisma.

## Requirements

- Node.js 20.x and npm
- MySQL 8.x running locally
- A MySQL account allowed to create and alter the `cospace-dev` database

## Run Locally

1. Install dependencies from the repository root:

   ```bash
   npm install
   ```

2. Create the development database in MySQL:

   ```bash
   mysql -u root -p
   ```

   At the MySQL prompt, run:

   ```sql
   CREATE DATABASE `cospace-dev`;
   EXIT;
   ```

   Use your local MySQL username in place of `root` if needed.

3. Create your local environment file and set the MySQL connection string:

   ```bash
   cp .env.example .env
   ```

   Edit `DATABASE_URL` in `.env` to use your MySQL username and password. URL-encode special characters in the password. The database name must match the database you created (`cospace-dev` by default).

4. Apply the checked-in Prisma migrations and generate the client:

   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

   Migrations create the application tables. They do not insert sample records; the project does not currently define a Prisma seed command.

5. Start the API:

   ```bash
   npm run dev
   ```

   The server listens on `http://localhost:5000`. In another terminal, check the API and its database-backed bookings route:

   ```bash
   curl -i http://localhost:5000/
   curl -i http://localhost:5000/bookings
   ```

   The root route reports API status. The bookings route exercises the database connection and returns an empty list until bookings are added.

## Prisma Development

After changing `prisma/schema.prisma`, create and apply a migration during development, then regenerate the client:

```bash
npx prisma migrate dev --name describe_your_change
npx prisma generate
```

Check migration state with:

```bash
npx prisma migrate status
```

## Project Layout

```text
prisma/
  schema.prisma
  migrations/
src/
  controllers/
  middleware/
  repositories/
  routes/
  services/
  utils/
```

The Prisma schema defines teams, users, desks, rooms, and bookings. `prisma/migrations/` contains the SQL migration history used to build the MySQL schema.

For the earlier, manual SQL migration and query exercise, see [docs/old-db-setup.md](docs/old-db-setup.md). It uses a separate `cospace` database and is not the setup for running the current Prisma-backed API.
