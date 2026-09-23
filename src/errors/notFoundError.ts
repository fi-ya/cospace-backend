import { AppError } from "../utils/appError";

export class NotFoundError extends AppError {
	constructor(message = "Not Found") {
		super(message, 404);
	}
}
