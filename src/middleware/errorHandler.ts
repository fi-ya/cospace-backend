import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export function errorHandler(
	err: unknown,
	_req: Request,
	res: Response,
	_next: NextFunction,
): void {
	if (err instanceof ZodError) {
		const fieldErrors = err.issues.map((issue) => ({
			field: issue.path.join("."),
			message: issue.message,
		}));

		res.status(400).json({ error: "Validation failed", fieldErrors });
		return;
	}

	console.error(err instanceof Error ? err.stack : err);
	res.status(500).json({ error: "Internal Server Error" });
}
