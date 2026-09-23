export class AppError extends Error {
	public readonly statusCode: number;
	public readonly status: "fail" | "error";
	public readonly isOperational: boolean;

	constructor(message: string, statusCode: number) {
		super(message);

		this.statusCode = statusCode;
		this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
		this.isOperational = true;

		// re-link the prototype chain so `instanceof` resolves correctly for every subclass
		Object.setPrototypeOf(this, new.target.prototype);

		Error.captureStackTrace(this, this.constructor);
	}
}
