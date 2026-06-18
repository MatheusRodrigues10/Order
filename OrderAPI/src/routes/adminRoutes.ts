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
adminRoutes.get("/reservas", asyncHandler(ctrl.listarReservas.bind(ctrl)));
adminRoutes.post("/reservas", validateRequest(criarReservaAdminSchema), asyncHandler(ctrl.criarReserva.bind(ctrl)));
adminRoutes.delete("/reservas/:id", validateRequest(reservaParamSchema), asyncHandler(ctrl.cancelarReserva.bind(ctrl)));

// ── Mesas ──────────────────────────────────────────────────────────────────────
adminRoutes.get("/mesas", asyncHandler(ctrl.listarMesas.bind(ctrl)));
adminRoutes.post("/mesas/:numero/bloquear", validateRequest(bloquearMesaSchema), asyncHandler(ctrl.bloquearMesa.bind(ctrl)));
adminRoutes.delete("/mesas/:numero/bloquear", validateRequest(mesaNumeroParamSchema), asyncHandler(ctrl.desbloquearMesa.bind(ctrl)));

// ── Horários de Funcionamento ──────────────────────────────────────────────────
adminRoutes.get("/horarios-funcionamento", asyncHandler(ctrl.listarHorarios.bind(ctrl)));
adminRoutes.put("/horarios-funcionamento/:dia/:turno", validateRequest(salvarHorarioFuncionamentoSchema), asyncHandler(ctrl.salvarHorario.bind(ctrl)));
adminRoutes.delete("/horarios-funcionamento/:dia/:turno", validateRequest(horarioFuncionamentoDiaTurnoParamSchema), asyncHandler(ctrl.removerHorario.bind(ctrl)));

// ── Config ─────────────────────────────────────────────────────────────────────
adminRoutes.get("/config", asyncHandler(ctrl.obterConfig.bind(ctrl)));
adminRoutes.put("/config/mesas", validateRequest(totalMesasSchema), asyncHandler(ctrl.alterarTotalMesas.bind(ctrl)));
adminRoutes.put("/config/capacidade", validateRequest(capacidadeSchema), asyncHandler(ctrl.alterarCapacidade.bind(ctrl)));
adminRoutes.put("/config/expiracao", validateRequest(expiracaoSchema), asyncHandler(ctrl.alterarExpiracao.bind(ctrl)));
adminRoutes.put("/config/limpeza", validateRequest(limpezaSchema), asyncHandler(ctrl.alterarLimpeza.bind(ctrl)));
adminRoutes.put("/config/horario", validateRequest(horarioSchema), asyncHandler(ctrl.alterarHorario.bind(ctrl)));
adminRoutes.put("/config/pin", validateRequest(pinSchema), asyncHandler(ctrl.alterarPin.bind(ctrl)));

export { adminRoutes };
