import bcrypt from "bcrypt";
import dotenv from "dotenv";
import jwt, { JsonWebTokenError, type JwtPayload } from "jsonwebtoken";
import type { User } from "../generated/prisma/client";

// dotenv configuration for loading environment variables
dotenv.config();

// Retrieve the JWT secret from environment variables and ensure it is defined
function getJwtSecret(): string {
	const jwtSecret = process.env.JWT_SECRET;
	if (!jwtSecret) {
		throw new Error("JWT_SECRET is required");
	}
	return jwtSecret;
}

// JWT secret used for signing and verifying tokens
const jwtSecret = getJwtSecret();
// Number of bcrypt salt rounds for hashing passwords
const saltRounds = 12;

// Hash a password using bcrypt with the defined salt rounds
export function hashPassword(password: string): Promise<string> {
	return bcrypt.hash(password, saltRounds);
}

// Compare a plaintext password with a hashed password using bcrypt
export function comparePassword(password: string, hash: string): Promise<boolean> {
	return bcrypt.compare(password, hash);
}

// JWT token payload interface and related functions
export interface AuthTokenPayload extends JwtPayload {
	userId: number;
	email: string;
}

// Generate a JWT token for a given user and verify a JWT token's payload
export function generateToken(user: Pick<User, "id" | "email">): string {
	return jwt.sign(
		{ userId: user.id, email: user.email },
		jwtSecret,
		{ expiresIn: "1h" },
	);
}

// Verify a JWT token and extract its payload
export function verifyToken(token: string): AuthTokenPayload {
	const payload = jwt.verify(token, jwtSecret);
	if (typeof payload !== "object" || payload === null) {
		throw new JsonWebTokenError("Invalid token payload");
	}
	const { userId, email } = payload;
	if (typeof userId !== "number" || typeof email !== "string") {
		throw new JsonWebTokenError("Invalid token payload");
	}

	return {
		userId,
		email,
	};
}
