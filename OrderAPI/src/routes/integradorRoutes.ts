import { Router } from "express";
import { IntegradorController } from "../controllers/integradorController";
import { apiPinMiddleware } from "../middlewares/apiPinMiddleware";
import { validateRequest } from "../middlewares/validateRequest";
import {
  confirmarReservaSchema,
  fluxoParamSchema,
  informarDataEspecificaSchema,
  informarDadosClienteSchema,
  informarPessoasSchema,
  selecionarHorarioSchema,
  sessionParamSchema
} from "../schemas/integradorSchemas";
import { asyncHandler } from "../utils/asyncHandler";

const integradorRoutes = Router();
const ctrl = new IntegradorController();

integradorRoutes.use(asyncHandler(apiPinMiddleware));

integradorRoutes.get("/fluxos", asyncHandler(ctrl.listarFluxos.bind(ctrl)));

integradorRoutes.post(
  "/fluxos/:fluxo/iniciar",
  validateRequest(fluxoParamSchema),
  asyncHandler(ctrl.iniciar.bind(ctrl))
);

integradorRoutes.post(
  "/fluxos/:fluxo/:sessionId/pessoas",
  validateRequest(informarPessoasSchema),
  asyncHandler(ctrl.informarPessoas.bind(ctrl))
);

integradorRoutes.get(
  "/fluxos/:fluxo/:sessionId/disponibilidade-semana",
  validateRequest(sessionParamSchema),
  asyncHandler(ctrl.disponibilidadeSemana.bind(ctrl))
);

integradorRoutes.post(
  "/fluxos/:fluxo/:sessionId/data-especifica",
  validateRequest(informarDataEspecificaSchema),
  asyncHandler(ctrl.informarDataEspecifica.bind(ctrl))
);

integradorRoutes.get(
  "/fluxos/:fluxo/:sessionId/disponibilidade-data",
  validateRequest(sessionParamSchema),
  asyncHandler(ctrl.disponibilidadeData.bind(ctrl))
);

integradorRoutes.post(
  "/fluxos/:fluxo/:sessionId/selecionar-horario",
  validateRequest(selecionarHorarioSchema),
  asyncHandler(ctrl.selecionarHorario.bind(ctrl))
);

integradorRoutes.post(
  "/fluxos/:fluxo/:sessionId/dados-cliente",
  validateRequest(informarDadosClienteSchema),
  asyncHandler(ctrl.informarDadosCliente.bind(ctrl))
);

integradorRoutes.get(
  "/fluxos/:fluxo/:sessionId/resumo",
  validateRequest(sessionParamSchema),
  asyncHandler(ctrl.resumo.bind(ctrl))
);

integradorRoutes.post(
  "/fluxos/:fluxo/:sessionId/confirmar",
  validateRequest(confirmarReservaSchema),
  asyncHandler(ctrl.confirmar.bind(ctrl))
);

integradorRoutes.get(
  "/fluxos/:fluxo/:sessionId/reserva",
  validateRequest(sessionParamSchema),
  asyncHandler(ctrl.obterReserva.bind(ctrl))
);

integradorRoutes.get(
  "/fluxos/:fluxo/:sessionId/estado",
  validateRequest(sessionParamSchema),
  asyncHandler(ctrl.estado.bind(ctrl))
);

integradorRoutes.delete(
  "/fluxos/:fluxo/:sessionId",
  validateRequest(sessionParamSchema),
  asyncHandler(ctrl.cancelar.bind(ctrl))
);

export { integradorRoutes };
