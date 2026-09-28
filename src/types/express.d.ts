import "express";
import type { AuthTokenPayload } from "../utils/auth";

// Extend Express Request interface to include authenticated user payload.
declare global {
	namespace Express {
		interface Request {
			user?: AuthTokenPayload;
		}
	}
}
