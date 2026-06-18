import type { Request, Response } from "express";
import { IntegradorReservaService } from "../services/integradorReservaService";
import { mapFluxoParam } from "../schemas/integradorSchemas";
import { ok, msg } from "../utils/apiResponse";

const service = new IntegradorReservaService();

function paramString(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

export class IntegradorController {
  async listarFluxos(_req: Request, res: Response) {
    return ok(res, service.listarFluxos());
  }

  async iniciar(req: Request, res: Response) {
    const fluxo = mapFluxoParam(paramString(req.params.fluxo) as "reserva-a" | "reserva-b");
    const result = service.iniciar(fluxo);
    return ok(res, result, 201);
  }

  async informarPessoas(req: Request, res: Response) {
    const fluxo = mapFluxoParam(paramString(req.params.fluxo) as "reserva-a" | "reserva-b");
    const { quantidadePessoas } = req.body;
    const result = service.informarPessoas(fluxo, paramString(req.params.sessionId), quantidadePessoas);
    return ok(res, result);
  }

  async disponibilidadeSemana(req: Request, res: Response) {
    const fluxo = mapFluxoParam(paramString(req.params.fluxo) as "reserva-a" | "reserva-b");
    const result = await service.disponibilidadeSemana(fluxo, paramString(req.params.sessionId));
    return ok(res, result);
  }

  async informarDataEspecifica(req: Request, res: Response) {
    const fluxo = mapFluxoParam(paramString(req.params.fluxo) as "reserva-a" | "reserva-b");
    const { data } = req.body;
    const result = service.informarDataEspecifica(fluxo, paramString(req.params.sessionId), data);
    return ok(res, result);
  }

  async disponibilidadeData(req: Request, res: Response) {
    const fluxo = mapFluxoParam(paramString(req.params.fluxo) as "reserva-a" | "reserva-b");
    const result = await service.disponibilidadeData(fluxo, paramString(req.params.sessionId));
    return ok(res, result);
  }

  async selecionarHorario(req: Request, res: Response) {
    const fluxo = mapFluxoParam(paramString(req.params.fluxo) as "reserva-a" | "reserva-b");
    const { data, hora } = req.body;
    const result = await service.selecionarHorario(
      fluxo,
      paramString(req.params.sessionId),
      data,
      hora
    );
    return ok(res, result);
  }

  async informarDadosCliente(req: Request, res: Response) {
    const fluxo = mapFluxoParam(paramString(req.params.fluxo) as "reserva-a" | "reserva-b");
    const { nomeCliente, telefone } = req.body;
    const result = service.informarDadosCliente(
      fluxo,
      paramString(req.params.sessionId),
      nomeCliente,
      telefone
    );
    return ok(res, result);
  }

  async resumo(req: Request, res: Response) {
    const fluxo = mapFluxoParam(paramString(req.params.fluxo) as "reserva-a" | "reserva-b");
    const result = service.resumo(fluxo, paramString(req.params.sessionId));
    return ok(res, result);
  }

  async confirmar(req: Request, res: Response) {
    const fluxo = mapFluxoParam(paramString(req.params.fluxo) as "reserva-a" | "reserva-b");
    const { confirmar } = req.body;
    const result = await service.confirmar(fluxo, paramString(req.params.sessionId), confirmar);
    return ok(res, result, confirmar ? 201 : 200);
  }

  async obterReserva(req: Request, res: Response) {
    const fluxo = mapFluxoParam(paramString(req.params.fluxo) as "reserva-a" | "reserva-b");
    const result = service.obterReserva(fluxo, paramString(req.params.sessionId));
    return ok(res, result);
  }

  async estado(req: Request, res: Response) {
    const fluxo = mapFluxoParam(paramString(req.params.fluxo) as "reserva-a" | "reserva-b");
    const result = service.estado(fluxo, paramString(req.params.sessionId));
    return ok(res, result);
  }

  async cancelar(req: Request, res: Response) {
    const fluxo = mapFluxoParam(paramString(req.params.fluxo) as "reserva-a" | "reserva-b");
    service.cancelar(fluxo, paramString(req.params.sessionId));
    return msg(res, "Sessão cancelada");
  }
}
