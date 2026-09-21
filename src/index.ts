import express from "express";

const app = express();
const port = 5000;

// Define the root route for the API
app.get("/", (_request, response) => {
	response.status(200).json({
		status: "active",
		message: "CoSpace API is running",
	});
});

app.listen(port, () => {
	console.log(`Server listening on port ${port}`);
});

export default app;
