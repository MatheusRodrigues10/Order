import { Router } from "express";
import { AdminController } from "../controllers/adminController";
import { authJwtMiddleware } from "../middlewares/authJwtMiddleware";
import { validateRequest } from "../middlewares/validateRequest";
import {
  criarReservaAdminSchema,
  reservaParamSchema,
  totalMesasSchema,
  capacidadeSchema,
  expiracaoSchema,
  limpezaSchema,
  horarioSchema,
  pinSchema,
  mesaNumeroParamSchema,
  bloquearMesaSchema,
  horarioFuncionamentoDiaTurnoParamSchema,
  salvarHorarioFuncionamentoSchema
} from "../schemas/adminSchemas";
import { asyncHandler } from "../utils/asyncHandler";

const adminRoutes = Router();
const ctrl = new AdminController();

adminRoutes.use(authJwtMiddleware);

// ── Dashboard ──────────────────────────────────────────────────────────────────
adminRoutes.get("/dashboard", asyncHandler(ctrl.dashboard.bind(ctrl)));

// ── Reservas ───────────────────────────────────────────────────────────────────
adminRoutes.get("/reservations", asyncHandler(ctrl.listarReservas.bind(ctrl)));
adminRoutes.post("/reservations", validateRequest(criarReservaAdminSchema), asyncHandler(ctrl.criarReserva.bind(ctrl)));
adminRoutes.delete("/reservations/:id", validateRequest(reservaParamSchema), asyncHandler(ctrl.cancelarReserva.bind(ctrl)));

// ── Mesas ──────────────────────────────────────────────────────────────────────
adminRoutes.get("/tables", asyncHandler(ctrl.listarMesas.bind(ctrl)));
adminRoutes.post("/tables/:numero/block", validateRequest(bloquearMesaSchema), asyncHandler(ctrl.bloquearMesa.bind(ctrl)));
adminRoutes.delete("/tables/:numero/block", validateRequest(mesaNumeroParamSchema), asyncHandler(ctrl.desbloquearMesa.bind(ctrl)));

// ── Horários de Funcionamento ──────────────────────────────────────────────────
adminRoutes.get("/operating-hours", asyncHandler(ctrl.listarHorarios.bind(ctrl)));
adminRoutes.put("/operating-hours/:dia/:turno", validateRequest(salvarHorarioFuncionamentoSchema), asyncHandler(ctrl.salvarHorario.bind(ctrl)));
adminRoutes.delete("/operating-hours/:dia/:turno", validateRequest(horarioFuncionamentoDiaTurnoParamSchema), asyncHandler(ctrl.removerHorario.bind(ctrl)));

// ── Config ─────────────────────────────────────────────────────────────────────
adminRoutes.get("/config", asyncHandler(ctrl.obterConfig.bind(ctrl)));
adminRoutes.put("/config/tables", validateRequest(totalMesasSchema), asyncHandler(ctrl.alterarTotalMesas.bind(ctrl)));
adminRoutes.put("/config/capacity", validateRequest(capacidadeSchema), asyncHandler(ctrl.alterarCapacidade.bind(ctrl)));
adminRoutes.put("/config/duration", validateRequest(expiracaoSchema), asyncHandler(ctrl.alterarExpiracao.bind(ctrl)));
adminRoutes.put("/config/cleanup", validateRequest(limpezaSchema), asyncHandler(ctrl.alterarLimpeza.bind(ctrl)));
adminRoutes.put("/config/hours", validateRequest(horarioSchema), asyncHandler(ctrl.alterarHorario.bind(ctrl)));
adminRoutes.put("/config/pin", validateRequest(pinSchema), asyncHandler(ctrl.alterarPin.bind(ctrl)));

export { adminRoutes };
