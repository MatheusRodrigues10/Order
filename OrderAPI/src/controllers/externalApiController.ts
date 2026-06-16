import type { Request, Response } from "express";
import { ReservaService } from "../services/reservaService";
import { ok } from "../utils/apiResponse";
import { AppError } from "../utils/AppError";

const reservaService = new ReservaService();

export class ExternalApiController {
  async status(req: Request, res: Response) {
    const { data, hora } = req.query;
    if (!data || !hora) {
      throw new AppError("Parâmetros 'data' e 'hora' são obrigatórios", 400);
    }
    const result = await reservaService.getStatusApi(String(data), String(hora));
    return ok(res, result);
  }

  async reservar(req: Request, res: Response) {
    const { quantidadePessoas, data, hora, nomeCliente, telefone } = req.body;
    const result = await reservaService.reserveAuto(quantidadePessoas, data, hora, nomeCliente, telefone);
    return ok(res, result, 201);
  }
}
