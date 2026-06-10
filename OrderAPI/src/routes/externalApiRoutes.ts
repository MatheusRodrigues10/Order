import { Router } from "express";
import { ExternalApiController } from "../controllers/externalApiController";
import { apiPinMiddleware } from "../middlewares/apiPinMiddleware";
import { asyncHandler } from "../utils/asyncHandler";

const externalApiRoutes = Router();
const externalApiController = new ExternalApiController();

externalApiRoutes.use(asyncHandler(apiPinMiddleware));
externalApiRoutes.get("/status", asyncHandler(externalApiController.status));
externalApiRoutes.post("/reservar", asyncHandler(externalApiController.reservar));

export { externalApiRoutes };
