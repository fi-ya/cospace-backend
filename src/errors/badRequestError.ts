import { AppError } from "../utils/appError";

export class BadRequestError extends AppError {
	constructor(message = "Bad Request") {
		super(message, 400);
	}
}
