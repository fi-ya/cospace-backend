import { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../errors/unauthorizedError";

// Hardcoded valid token for authentication purposes
const VALID_TOKEN = "super-secret-key";

// Middleware function to authenticate requests using the hardcoded token
// Note: This is a simple example and should not be used in production. 
// Replaced by requireAuth middleware  see `src/middleware/requireAuth.ts`
export function auth(req: Request, _res: Response, next: NextFunction): void {
	const token = req.headers.authorization;

	if (token !== VALID_TOKEN) {
		next(new UnauthorizedError());
		return;
	}

	next();
}
