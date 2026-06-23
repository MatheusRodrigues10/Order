import type { Request, Response } from "express";
import { EventDayService } from "../services/eventDayService";
import { ok, msg } from "../utils/apiResponse";

const service = new EventDayService();

export class EventDayController {
  async listar(_req: Request, res: Response) {
    const result = await service.listar();
    return ok(res, result);
  }

  async criar(req: Request, res: Response) {
    const { data, nomeCliente, telefone, motivo } = req.body;
    const result = await service.criar(data, nomeCliente, telefone, motivo);
    return ok(res, result, 201);
  }

  async remover(req: Request, res: Response) {
    const data = req.params["data"] as string;
    await service.remover(data);
    return msg(res, "Evento removido com sucesso");
  }
}
