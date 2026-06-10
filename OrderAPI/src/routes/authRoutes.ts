import { Router } from "express";
import { AuthController } from "../controllers/authController";
import { asyncHandler } from "../utils/asyncHandler";
import { validateRequest } from "../middlewares/validateRequest";
import { loginSchema } from "../schemas/authSchemas";

const authRoutes = Router();
const authController = new AuthController();

authRoutes.post("/login", validateRequest(loginSchema), asyncHandler(authController.login));

export { authRoutes };
