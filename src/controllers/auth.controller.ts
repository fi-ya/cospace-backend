import { NextFunction, Request, Response } from "express";
import { Prisma, type User } from "../generated/prisma/client";
import { HttpStatus } from "../constants/httpStatus";
import { BadRequestError } from "../errors/badRequestError";
import { UnauthorizedError } from "../errors/unauthorizedError";
import type { LoginInput, RegisterInput } from "../schemas/auth.schema";
import { UserRepository } from "../repositories/user.repository";
import { comparePassword, generateToken, hashPassword } from "../utils/auth";

// Utility type and function to safely exclude the password from the User object
type SafeUser = Omit<User, "password">;

// Converts a User object to a SafeUser by excluding the password field
function toSafeUser(user: User): SafeUser {
	const { password: _password, ...safeUser } = user;
	return safeUser;
}

// Checks if an error is a unique constraint violation from Prisma
function isUniqueConstraintError(error: unknown): boolean {
	return (
		error instanceof Prisma.PrismaClientKnownRequestError &&
		error.code === "P2002"
	);
}

// Controller class for handling authentication-related operations
export class AuthController {
    // Initializes the AuthController with a UserRepository instance
	constructor(private readonly userRepository = new UserRepository()) {}

    // Handles user registration
	register = async (
		req: Request<Record<string, never>, SafeUser, RegisterInput>,
		res: Response,
		next: NextFunction,
	): Promise<void> => {
		try {
			// Extract and normalize the email
			const email = req.body.email.trim().toLowerCase();

            // Hash the password before storing it in the database
			const password = await hashPassword(req.body.password);

            // Create the user in the database with the hashed password
			const user = await this.userRepository.create({
				first_name: req.body.first_name,
				last_name: req.body.last_name,
				email,
				password,
				...(req.body.team_id !== undefined && { team_id: req.body.team_id }),
			});

            // Respond with the created user, excluding the password
			res.status(HttpStatus.CREATED).json(toSafeUser(user));
		} catch (error: unknown) {
            // Handle unique constraint violation (duplicate email) and other errors
			if (isUniqueConstraintError(error)) {
				next(new BadRequestError("An account with this email already exists"));
				return;
			}
			next(error);
		}
	};

    // Handles user login
	login = async (
		req: Request<Record<string, never>, unknown, LoginInput>,
		res: Response,
		next: NextFunction,
	): Promise<void> => {
		try {
            // Find the user by email and verify the password
			const user = await this.userRepository.findByEmail(
				req.body.email.trim().toLowerCase(),
			);

            // If the user is not found or the password does not match, return an unauthorized error
			if (!user || !(await comparePassword(req.body.password, user.password))) {
				next(new UnauthorizedError("Invalid email or password"));
				return;
			}

            // Respond with the generated token and the safe user object
			res.status(HttpStatus.OK).json({
				token: generateToken(user),
				user: toSafeUser(user),
			});
		} catch (error: unknown) {
			next(error);
		}
	};
}