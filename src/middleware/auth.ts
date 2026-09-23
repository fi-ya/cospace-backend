import { NextFunction, Request, Response } from "express";
import { HttpStatus } from "../constants/httpStatus";

const VALID_TOKEN = "super-secret-key";

export function auth(req: Request, res: Response, next: NextFunction): void {
	const token = req.headers.authorization;

	if (token !== VALID_TOKEN) {
		res.status(HttpStatus.UNAUTHORIZED).json({ error: "Unauthorized" });
		return;
	}

	next();
}
