import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";
import { BadRequestError } from "../errors/badRequestError";

export function validate(requiredFields: string[]) {
	return (req: Request, _res: Response, next: NextFunction): void => {
		const missingFields = requiredFields.filter(
			(field) => req.body?.[field] === undefined,
		);

		if (missingFields.length > 0) {
			next(
				new BadRequestError(
					`Missing required fields: ${missingFields.join(", ")}`,
				),
			);
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
