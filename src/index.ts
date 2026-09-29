import express, { Request, Response } from "express";
import bookingRouter from "./routes/booking.routes";
import { logger } from "./middleware/logger";
import { errorHandler } from "./middleware/errorHandler";
import { NotFoundError } from "./errors/notFoundError";
import { HttpStatus } from "./constants/httpStatus";

const app = express();
const port = 5000;

// Register middleware 
app.use(express.json());
app.use(logger);

// Define the root route for the API
app.get("/", (req: Request, res: Response) => {
	res.status(HttpStatus.OK).json({
		status: "active",
		message: "CoSpace API is running",
	});
});

app.use("/bookings", bookingRouter);

// Route to trigger a test NotFoundError
app.get("/boom-app-error", () => {
	throw new NotFoundError("Test resource not found");
});

import { ForbiddenError } from "./errors/forbiddenError";

app.get("/boom-forbidden", () => {
    throw new ForbiddenError("You do not have permission to access this resource");
});

// Temporary: trigger a plain, unexpected error to verify sanitized 500 response
app.get("/boom-unexpected", () => {
	throw new Error("db connection string: postgres://user:pass@internal-host/db");
});

// Routes to demonstrate built-in JavaScript error types through the error handler
app.get("/boom-syntax-error", () => {
  // when code or text could not be parsed as valid syntax
	throw new SyntaxError("Example syntax error");
});

app.get("/boom-type-error", () => {
  // when a value is not of the expected type
	throw new TypeError("Example type error");
});

app.get("/boom-reference-error", () => {
  // when an invalid reference is encountered
	throw new ReferenceError("Example reference error");
});

app.get("/boom-range-error", () => {
  // when a value is not within the allowed range
	throw new RangeError("Example range error");
});

app.get("/boom-uri-error", () => {
  // when an invalid URI is encountered
	throw new URIError("Example URI error");
});

app.get("/boom-eval-error", () => {
  // when an error occurs during the evaluation of code
	throw new EvalError("Example eval error");
});

app.get("/boom-aggregate-error", () => {
  // when multiple errors need to be reported together
	throw new AggregateError(
		[new Error("First example error"), new Error("Second example error")],
		"Example aggregate error",
	);
});

app.use(errorHandler);

const server = app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

const shutdown = (signal: string) => {
  console.log(`${signal} received: closing HTTP server`);

  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export default app;
