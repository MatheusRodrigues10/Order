import { Router } from "express";
import { ExternalApiController } from "../controllers/externalApiController";
import { apiPinMiddleware } from "../middlewares/apiPinMiddleware";
import { validateRequest } from "../middlewares/validateRequest";
import { reservarExternalSchema, statusQuerySchema } from "../schemas/adminSchemas";
import { asyncHandler } from "../utils/asyncHandler";

const externalApiRoutes = Router();
const ctrl = new ExternalApiController();

externalApiRoutes.use(asyncHandler(apiPinMiddleware));

externalApiRoutes.get("/status", validateRequest(statusQuerySchema), asyncHandler(ctrl.status.bind(ctrl)));
externalApiRoutes.post("/reservar", validateRequest(reservarExternalSchema), asyncHandler(ctrl.reservar.bind(ctrl)));

export { externalApiRoutes };
