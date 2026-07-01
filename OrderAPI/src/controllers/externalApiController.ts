import type { Request, Response } from "express";
import { ReservaService } from "../services/reservaService";
import { AppError } from "../utils/AppError";
import { ok } from "../utils/apiResponse";

const reservaService = new ReservaService();

export class ExternalApiController {
  async now(_req: Request, res: Response) {
    const result = await reservaService.getNow();
    return ok(res, result);
  }

  async status(req: Request, res: Response) {
    const data = req.query["data"] as string;
    const hora = req.query["hora"] as string;
    const result = await reservaService.getStatusApi(data, hora);
    return ok(res, result);
  }

  async disponibilidade(req: Request, res: Response) {
    const params = { ...req.query, ...req.body };
    const { quantidadePessoas, duracaoMinutos, dataInicio, dataFim } = params;
    if (quantidadePessoas === undefined || quantidadePessoas === null) {
      throw new AppError("Quantidade de pessoas é obrigatória", 400);
    }
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
