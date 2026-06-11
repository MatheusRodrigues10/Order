import type { Request, Response } from "express";
import { ReservaService } from "../services/reservaService";
import { ok } from "../utils/apiResponse";

const reservaService = new ReservaService();

export class ExternalApiController {
  async status(_request: Request, response: Response) {
    const result = await reservaService.getStatus();
    return ok(response, result);
  }

  async reservar(request: Request, response: Response) {
    const result = await reservaService.reserveAuto(request.body ?? {});
    return ok(response, result, 201);
  }
}
