import { Router } from "express";
import { AdminController } from "../controllers/adminController";
import { authJwtMiddleware } from "../middlewares/authJwtMiddleware";
import { validateRequest } from "../middlewares/validateRequest";
import {
  criarReservaSchema,
  expiracaoSchema,
  mesaParamSchema,
  totalMesasSchema
} from "../schemas/adminSchemas";
import { asyncHandler } from "../utils/asyncHandler";

const adminRoutes = Router();
const adminController = new AdminController();

adminRoutes.use(authJwtMiddleware);
adminRoutes.get("/dashboard", asyncHandler(adminController.dashboard));
adminRoutes.get("/reservas", asyncHandler(adminController.listarReservas));
adminRoutes.post("/reservas", validateRequest(criarReservaSchema), asyncHandler(adminController.criarReserva));
adminRoutes.delete("/reservas/:mesa", validateRequest(mesaParamSchema), asyncHandler(adminController.cancelarReserva));
adminRoutes.get("/config", asyncHandler(adminController.obterConfig));
adminRoutes.put("/config/mesas", validateRequest(totalMesasSchema), asyncHandler(adminController.alterarTotalMesas));
adminRoutes.put("/config/expiracao", validateRequest(expiracaoSchema), asyncHandler(adminController.alterarExpiracao));
adminRoutes.put("/config/limpeza", validateRequest(expiracaoSchema), asyncHandler(adminController.alterarLimpeza));

export { adminRoutes };
