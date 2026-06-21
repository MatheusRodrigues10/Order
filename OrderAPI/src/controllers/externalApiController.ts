import type { Request, Response } from "express";
import { ReservaService } from "../services/reservaService";
import { ok } from "../utils/apiResponse";
import { AppError } from "../utils/AppError";

const reservaService = new ReservaService();

export class ExternalApiController {
  async now(_req: Request, res: Response) {
    const result = await reservaService.getNow();
    return ok(res, result);
  }

  async status(req: Request, res: Response) {
    const { data, hora } = req.query;
    if (!data || !hora) {
      throw new AppError("Parâmetros 'data' e 'hora' são obrigatórios", 400);
    }
    const result = await reservaService.getStatusApi(String(data), String(hora));
    return ok(res, result);
  }

  async disponibilidade(req: Request, res: Response) {
    const { quantidadePessoas, duracaoMinutos, dataInicio, dataFim } = req.query;
    const result = await reservaService.getDisponibilidade(
      Number(quantidadePessoas),
      dataInicio ? String(dataInicio) : undefined,
      dataFim ? String(dataFim) : undefined,
      duracaoMinutos ? Number(duracaoMinutos) : undefined
    );
    return ok(res, result);
  }

  async reservar(req: Request, res: Response) {
    const { quantidadePessoas, data, hora, duracaoMinutos, nomeCliente, telefone } = req.body;
    const result = await reservaService.reserveAuto(
      quantidadePessoas,
      data,
      hora,
      duracaoMinutos,
      nomeCliente,
      telefone
    );
    return ok(res, result, 201);
  }
}
