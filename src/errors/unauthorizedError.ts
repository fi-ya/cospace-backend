import { AppError } from "../utils/appError";

export class UnauthorizedError extends AppError {
	constructor(message = "Unauthorized") {
		super(message, 401);
	}
}
