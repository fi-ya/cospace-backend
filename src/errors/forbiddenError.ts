import { AppError } from "../utils/appError";

export class ForbiddenError extends AppError {
	constructor(message = "Forbidden") {
		super(message, 403);
	}
}
