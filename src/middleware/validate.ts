import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";

export function validate(requiredFields: string[]) {
	return (req: Request, res: Response, next: NextFunction): void => {
		const missingFields = requiredFields.filter(
			(field) => req.body?.[field] === undefined,
		);

		if (missingFields.length > 0) {
			res.status(400).json({ error: "Missing required fields", missingFields });
			return;
		}

		next();
	};
}

export function validateSchema(schema: ZodSchema) {
	return (req: Request, res: Response, next: NextFunction): void => {
		const result = schema.safeParse(req.body);

		if (!result.success) {
			res.status(400).json({ error: "Validation failed", details: result.error.issues });
			return;
		}

		req.body = result.data;
		next();
	};
}
