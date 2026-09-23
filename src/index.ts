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

// Temporary: trigger a plain, unexpected error to verify sanitized 500 response
app.get("/boom-unexpected", () => {
	throw new Error("db connection string: postgres://user:pass@internal-host/db");
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
