import { HttpStatus } from "../constants/httpStatus";
import { AppError } from "../utils/appError";

export class BadRequestError extends AppError {
	constructor(message = "Bad Request") {
		super(message, HttpStatus.BAD_REQUEST);
	}
}
