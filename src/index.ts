import express, { Request, Response } from "express";

const app = express();
const port = 5000;

// Define the root route for the API
app.get("/", (req: Request, res: Response) => {
	res.status(200).json({
		status: "active",
		message: "CoSpace API is running",
	});
});

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
