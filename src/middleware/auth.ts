import { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../errors/unauthorizedError";

const VALID_TOKEN = "super-secret-key";

export function auth(req: Request, _res: Response, next: NextFunction): void {
	const token = req.headers.authorization;

	if (token !== VALID_TOKEN) {
		next(new UnauthorizedError());
		return;
	}

	next();
}
