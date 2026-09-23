import { HttpStatus } from "../constants/httpStatus";
import { AppError } from "../utils/appError";

export class UnauthorizedError extends AppError {
	constructor(message = "Unauthorized") {
		super(message, HttpStatus.UNAUTHORIZED);
	}
}
