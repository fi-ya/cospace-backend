import { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../errors/unauthorizedError";
import { verifyToken } from "../utils/auth";

// Middleware to require authentication via a Bearer token in the Authorization header.
export function requireAuth(
	req: Request,
	_res: Response,
	next: NextFunction,
): void {
    // Get the Authorization header and extract the Bearer token.
	const authorization = req.get("authorization");
    // Match the Bearer token pattern.
	const match = authorization?.match(/^Bearer\s+(.+)$/i);

    // If no Bearer token is found, respond with an UnauthorizedError.
	if (!match?.[1]) {
		next(new UnauthorizedError());
		return;
	}

	try {
        // Verify the token and attach the decoded user payload to the request.
		req.user = verifyToken(match[1]);
		next();
	} catch {
		next(new UnauthorizedError());
	}
}
