import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { HttpStatus } from "../constants/httpStatus";
import { AppError } from "../utils/appError";

export function errorHandler(
	err: unknown,
	_req: Request,
	res: Response,
	_next: NextFunction,
): void {

	// Handle malformed JSON bodies thrown by express.json() before anything else
	if (err instanceof SyntaxError && "body" in err) {
		res.status(HttpStatus.BAD_REQUEST).json({ error: "Malformed JSON in request body" });
		return;
	}

	// Handle known AppError instances first
	if (err instanceof AppError) {
		res.status(err.statusCode).json({
			status: err.status,
			message: err.message,
			errors: [],
		});
		return;
	}

	// Handle Zod validation errors next
	if (err instanceof ZodError) {
		const fieldErrors = err.issues.map((issue) => ({
			field: issue.path.join("."),
			message: issue.message,
		}));

		res.status(HttpStatus.BAD_REQUEST).json({ error: "Validation failed", fieldErrors });
		return;
	}

	// Anything reaching here is unexpected and not operational: log internally, never expose it
	console.error(err instanceof Error ? err.stack : err);
	res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: "Something went wrong on our end" });
}
