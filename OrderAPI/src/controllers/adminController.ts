import type { Request, Response } from "express";
import { ReservaService } from "../services/reservaService";
import { SettingsService } from "../services/settingsService";
import { message, ok } from "../utils/apiResponse";

const reservaService = new ReservaService();
const settingsService = new SettingsService();

export class AdminController {
  async dashboard(_request: Request, response: Response) {
    const result = await reservaService.getStatus();
    return ok(response, result);
  }

  async listarReservas(_request: Request, response: Response) {
    const result = await reservaService.listActive();
    return ok(response, result);
  }

  async disponibilidade(request: Request, response: Response) {
    const { dataReserva, horarioInicio, duracaoMinutos } = request.query;
    const result = await reservaService.getDisponibilidade({
      dataReserva: String(dataReserva),
      horarioInicio: String(horarioInicio),
      duracaoMinutos: Number(duracaoMinutos)
    });
    return ok(response, result);
  }

  async criarReserva(request: Request, response: Response) {
    const { mesa, dataReserva, horarioInicio, duracaoMinutos } = request.body;
    const result = await reservaService.reserveSpecific(mesa, {
      dataReserva,
      horarioInicio,
      duracaoMinutos
    });
    return ok(response, result, 201);
  }

  async cancelarReserva(request: Request, response: Response) {
    const id = Number(request.params.id);
    await reservaService.cancel(id);
    return message(response, "Reserva cancelada com sucesso");
  }

  async obterConfig(_request: Request, response: Response) {
    const settings = await settingsService.getSettings();
    return ok(response, {
      totalMesas: settings.totalMesas,
      duracaoReservaMinutos: settings.duracaoReservaMinutos,
      duracaoLimpezaMinutos: settings.duracaoLimpezaMinutos
    });
  }

  async alterarTotalMesas(request: Request, response: Response) {
    const { totalMesas } = request.body;
    const settings = await settingsService.updateTotalMesas(totalMesas);
    return ok(response, {
      totalMesas: settings.totalMesas
    });
  }

  async alterarExpiracao(request: Request, response: Response) {
    const { duracaoMinutos } = request.body;
    const settings = await settingsService.updateDuracaoReservaMinutos(duracaoMinutos);
    return ok(response, {
      duracaoReservaMinutos: settings.duracaoReservaMinutos
    });
  }

  async alterarLimpeza(request: Request, response: Response) {
    const { duracaoMinutos } = request.body;
    const settings = await settingsService.updateDuracaoLimpezaMinutos(duracaoMinutos);
    return ok(response, {
      duracaoLimpezaMinutos: settings.duracaoLimpezaMinutos
    });
  }
}
