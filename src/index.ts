import express, { Request, Response } from "express";

interface Booking {
  id: number;
  desk: string;
  floor: number;
  date: string;
  active: boolean;
}

export const bookings: Booking[] = [
  { id: 1, desk: "Desk-01", floor: 1, date: "2026-09-21", active: true },
  { id: 2, desk: "Desk-02", floor: 1, date: "2026-09-22", active: true },
  { id: 3, desk: "Desk-03", floor: 2, date: "2026-09-23", active: false },
];

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
