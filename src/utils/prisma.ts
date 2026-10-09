import dotenv from "dotenv";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client";

dotenv.config();

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