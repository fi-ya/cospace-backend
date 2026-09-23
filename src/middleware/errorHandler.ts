import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/appError";

export function errorHandler(
	err: unknown,
	_req: Request,
	res: Response,
	_next: NextFunction,
): void {

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

		res.status(400).json({ error: "Validation failed", fieldErrors });
		return;
	}

	// Anything reaching here is unexpected and not operational: log internally, never expose it
	console.error(err instanceof Error ? err.stack : err);
	res.status(500).json({ error: "Something went wrong on our end" });
}
