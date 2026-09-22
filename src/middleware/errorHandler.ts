import { NextFunction, Request, Response } from "express";

export function errorHandler(
	err: unknown,
	_req: Request,
	res: Response,
	_next: NextFunction,
): void {
	console.error(err instanceof Error ? err.stack : err);
	res.status(500).json({ error: "Internal Server Error" });
}
