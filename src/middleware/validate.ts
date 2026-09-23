import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";
import { HttpStatus } from "../constants/httpStatus";

export function validate(requiredFields: string[]) {
	return (req: Request, res: Response, next: NextFunction): void => {
		const missingFields = requiredFields.filter(
			(field) => req.body?.[field] === undefined,
		);

		if (missingFields.length > 0) {
			res.status(HttpStatus.BAD_REQUEST).json({ error: "Missing required fields", missingFields });
			return;
		}

		next();
	};
}

export function validateSchema(schema: ZodSchema) {
	return (req: Request, _res: Response, next: NextFunction): void => {
		try {
			req.body = schema.parse(req.body);
			next();
		} catch (error) {
			next(error);
		}
	};
}
