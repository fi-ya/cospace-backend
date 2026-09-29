import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import dotenv from "dotenv";
import { PrismaClient } from "../generated/prisma/client";

// Load environment variables from .env file
dotenv.config();

// Parse the database URL and configure the Prisma MariaDB adapter
const databaseUrl = process.env.DATABASE_URL;

// Ensure the database URL is provided
if (!databaseUrl) {
	throw new Error("DATABASE_URL is required");
}

// Create a URL object from the database URL
const connection = new URL(databaseUrl);

// Configure the Prisma MariaDB adapter with the connection details
const adapter = new PrismaMariaDb({
	host: connection.hostname,
	port: Number(connection.port || 3306),
	user: decodeURIComponent(connection.username),
	password: decodeURIComponent(connection.password),
	database: decodeURIComponent(connection.pathname.slice(1)),
});

// Export the Prisma client instance with the configured adapter
export const prisma = new PrismaClient({ adapter });