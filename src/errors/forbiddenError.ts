import { HttpStatus } from "../constants/httpStatus";
import { AppError } from "../utils/appError";

export class ForbiddenError extends AppError {
	constructor(message = "Forbidden") {
		super(message, HttpStatus.FORBIDDEN);
	}
}
