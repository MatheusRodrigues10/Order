import type { Request, Response } from "express";
import { ReservaService } from "../services/reservaService";
import { SettingsService } from "../services/settingsService";
import { MesaBloqueioService } from "../services/mesaBloqueioService";
import { HorarioFuncionamentoService } from "../services/horarioFuncionamentoService";
import { ok, msg } from "../utils/apiResponse";

const reservaService             = new ReservaService();
const settingsService            = new SettingsService();
const mesaBloqueioService        = new MesaBloqueioService();
const horarioFuncionamentoService = new HorarioFuncionamentoService();

export class AdminController {
  // ── Dashboard ───────────────────────────────────────────────────────────────
  async dashboard(_req: Request, res: Response) {
    const data = await reservaService.getDashboard();
    return ok(res, data);
  }

  // ── Reservas ─────────────────────────────────────────────────────────────────
  async listarReservas(_req: Request, res: Response) {
    const reservas = await reservaService.listActive();
    return ok(res, reservas);
  }

  async criarReserva(req: Request, res: Response) {
    const { mesa, quantidadePessoas, data, hora, duracaoMinutos, nomeCliente, telefone } = req.body;
    const result = await reservaService.reserveSpecific(mesa, quantidadePessoas, data, hora, nomeCliente, telefone, duracaoMinutos);
    return ok(res, result, 201);
  }

  async cancelarReserva(req: Request, res: Response) {
    const id = Number(req.params.id);
    await reservaService.cancel(id);
    return msg(res, "Reserva cancelada com sucesso");
  }

  // ── Mesas ─────────────────────────────────────────────────────────────────────
  async listarMesas(_req: Request, res: Response) {
    const mesas = await reservaService.listarMesas();
    return ok(res, mesas);
  }

  async bloquearMesa(req: Request, res: Response) {
    const numero = Number(req.params.numero);
    const { bloqueadaPor, motivo } = req.body;
    const result = await mesaBloqueioService.bloquear(numero, bloqueadaPor, motivo);
    return ok(res, result, 201);
  }

  async desbloquearMesa(req: Request, res: Response) {
    const numero = Number(req.params.numero);
    await mesaBloqueioService.desbloquear(numero);
    return msg(res, "Mesa desbloqueada com sucesso");
  }

  // ── Horários de Funcionamento ─────────────────────────────────────────────────
  async listarHorarios(_req: Request, res: Response) {
    const horarios = await horarioFuncionamentoService.listar();
    return ok(res, horarios);
  }

  async salvarHorario(req: Request, res: Response) {
    const dia   = Number(req.params.dia);
    const turno = Number(req.params.turno);
    const { horaAbertura, horaFechamento, ativo } = req.body;
    const result = await horarioFuncionamentoService.salvar(dia, turno, horaAbertura, horaFechamento, ativo ?? true);
    return ok(res, result);
  }

  async removerHorario(req: Request, res: Response) {
    const dia   = Number(req.params.dia);
    const turno = Number(req.params.turno);
    await horarioFuncionamentoService.remover(dia, turno);
    return msg(res, "Horário de funcionamento removido");
  }

  // ── Config ────────────────────────────────────────────────────────────────────
  async obterConfig(_req: Request, res: Response) {
    const settings = await settingsService.getSettings();
    return ok(res, settings);
  }

  async alterarTotalMesas(req: Request, res: Response) {
    const { totalMesas } = req.body;
    const settings = await settingsService.updateTotalMesas(totalMesas);
    return ok(res, { totalMesas: settings.totalMesas });
  }

  async alterarCapacidade(req: Request, res: Response) {
    const { lugaresPorMesa } = req.body;
    const settings = await settingsService.updateLugaresPorMesa(lugaresPorMesa);
    return ok(res, { lugaresPorMesa: settings.lugaresPorMesa });
  }

  async alterarExpiracao(req: Request, res: Response) {
    const { duracaoReservaMinutos } = req.body;
    const settings = await settingsService.updateDuracaoReservaMinutos(duracaoReservaMinutos);
    return ok(res, { duracaoReservaMinutos: settings.duracaoReservaMinutos });
  }

  async alterarLimpeza(req: Request, res: Response) {
    const { tempoLimpezaMinutos } = req.body;
    const settings = await settingsService.updateTempoLimpezaMinutos(tempoLimpezaMinutos);
    return ok(res, { tempoLimpezaMinutos: settings.tempoLimpezaMinutos });
  }

  async alterarHorario(req: Request, res: Response) {
    const { abertura, fechamento } = req.body;
    const settings = await settingsService.updateHorario(abertura, fechamento);
    return ok(res, { horarioAbertura: settings.horarioAbertura, horarioFechamento: settings.horarioFechamento });
  }

  async alterarPin(req: Request, res: Response) {
    const { pin } = req.body;
    await settingsService.updatePin(pin);
    return msg(res, "PIN atualizado com sucesso");
  }
}
