import { NextFunction, Request, Response, Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { validateSchema } from "../middleware/validate";
import {
	LoginInput,
	loginSchema,
	registerSchema,
	RegisterInput,
} from "../schemas/auth.schema";

// Routes for handling authentication-related requests (register and login)
const router = Router();
// Initialize the authentication controller
const authController = new AuthController();

// Route for user registration
router.post(
	"/register",
	validateSchema(registerSchema),
	(req: Request<Record<string, never>, unknown, RegisterInput>, res: Response, next: NextFunction) =>
		authController.register(req, res, next),
);

// Route for user login
router.post(
	"/login",
	validateSchema(loginSchema),
	(req: Request<Record<string, never>, unknown, LoginInput>, res: Response, next: NextFunction) =>
		authController.login(req, res, next),
);

export default router;