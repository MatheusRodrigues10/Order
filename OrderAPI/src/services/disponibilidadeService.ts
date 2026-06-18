import { AppError } from "../utils/AppError";
import { ReservaRepository } from "../repositories/reservaRepository";
import { MesaBloqueioRepository } from "../repositories/mesaBloqueioRepository";
import { SettingsService } from "./settingsService";
import { HorarioFuncionamentoService } from "./horarioFuncionamentoService";
import type { SlotDisponivel } from "../types/integrador";

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DIAS_SEMANA_COMPLETO = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export class DisponibilidadeService {
  constructor(
    private readonly reservaRepo = new ReservaRepository(),
    private readonly settingsService = new SettingsService(),
    private readonly mesaBloqueioRepo = new MesaBloqueioRepository(),
    private readonly horarioFuncionamentoService = new HorarioFuncionamentoService()
  ) {}

  async listarSemanaAtual(quantidadePessoas: number): Promise<SlotDisponivel[]> {
    const hoje = this.startOfDay(new Date());
    const opcoes: SlotDisponivel[] = [];

    for (let offset = 0; offset < 7; offset++) {
      const data = new Date(hoje);
      data.setDate(hoje.getDate() + offset);
      const slot = await this.listarHorariosDia(quantidadePessoas, data);
      if (slot && slot.horarios.length > 0) {
        opcoes.push(slot);
      }
    }

    return opcoes;
  }

  async listarHorariosData(quantidadePessoas: number, data: string): Promise<SlotDisponivel> {
    const dataObj = this.parseData(data);
    const slot = await this.listarHorariosDia(quantidadePessoas, dataObj);

    if (!slot || slot.horarios.length === 0) {
      throw new AppError("Nenhum horário disponível para a data informada", 404);
    }

    return slot;
  }

  async validarHorarioDisponivel(quantidadePessoas: number, data: string, hora: string) {
    const slot = await this.listarHorariosData(quantidadePessoas, data);
    if (!slot.horarios.includes(hora)) {
      throw new AppError(
        `Horário ${hora} indisponível em ${data}. Opções: ${slot.horarios.join(", ")}`,
        409,
        { horariosDisponiveis: slot.horarios }
      );
    }
  }

  private async listarHorariosDia(quantidadePessoas: number, data: Date): Promise<SlotDisponivel | null> {
    await this.reservaRepo.deleteExpired();

    const settings = await this.settingsService.getSettings();
    const horariosTurno = await this.gerarHorariosTurno(data);
    if (horariosTurno.length === 0) return null;

    const mesasNecessarias = Math.ceil(quantidadePessoas / settings.lugaresPorMesa);
    const disponiveis: string[] = [];

    for (const hora of horariosTurno) {
      const { inicioReserva, fimLimpeza } = this.calcularPeriodo(
        data,
        hora,
        settings.duracaoReservaMinutos,
        settings.tempoLimpezaMinutos
      );

      if (inicioReserva < new Date()) continue;

      try {
        await this.horarioFuncionamentoService.validarHorarioReserva(
          inicioReserva,
          new Date(inicioReserva.getTime() + settings.duracaoReservaMinutos * 60_000)
        );
      } catch {
        continue;
      }

      const mesasLivres = await this.encontrarMesasLivres(
        mesasNecessarias,
        inicioReserva,
        fimLimpeza,
        settings.totalMesas
      );

      if (mesasLivres.length >= mesasNecessarias) {
        disponiveis.push(hora);
      }
    }

    if (disponiveis.length === 0) return null;

    const dataIso = this.formatDataIso(data);
    return {
      data: dataIso,
      dataFormatada: `${DIAS_SEMANA[data.getDay()]} ${this.formatDataBr(data)}`,
      diaSemana: DIAS_SEMANA_COMPLETO[data.getDay()],
      horarios: disponiveis
    };
  }

  private async gerarHorariosTurno(data: Date): Promise<string[]> {
    const horarios = await this.horarioFuncionamentoService.listar();
    const doDia = horarios.filter((h) => h.diaSemana === data.getDay() && h.ativo);

    const turnos = doDia.length > 0 ? doDia : [{ horaAbertura: "19:00", horaFechamento: "23:00" }];
    const slots = new Set<string>();

    for (const turno of turnos) {
      const [abH, abM] = turno.horaAbertura.split(":").map(Number);
      const [feH, feM] = turno.horaFechamento.split(":").map(Number);
      const inicioMin = abH * 60 + abM;
      const fimMin = feH * 60 + feM;

      for (let min = inicioMin; min <= fimMin - 120; min += 30) {
        const h = Math.floor(min / 60);
        const m = min % 60;
        slots.add(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      }
    }

    return [...slots].sort();
  }

  private async encontrarMesasLivres(
    mesasNecessarias: number,
    inicioReserva: Date,
    fimLimpeza: Date,
    totalMesas: number
  ) {
    const conflitos = await this.reservaRepo.findConflicts(inicioReserva, fimLimpeza);
    const mesasComConflito = new Set(conflitos.map((c) => c.numeroMesa));
    const bloqueadas = await this.mesaBloqueioRepo.getBloqueadasSet();

    if (mesasNecessarias <= 1) {
      const livres: number[] = [];
      for (let mesa = 1; mesa <= totalMesas; mesa++) {
        if (!mesasComConflito.has(mesa) && !bloqueadas.has(mesa)) {
          livres.push(mesa);
        }
      }
      return livres;
    }

    for (let inicio = 1; inicio <= totalMesas - mesasNecessarias + 1; inicio++) {
      const grupo = Array.from({ length: mesasNecessarias }, (_, i) => inicio + i);
      const ok = grupo.every((m) => !mesasComConflito.has(m) && !bloqueadas.has(m));
      if (ok) return grupo;
    }

    return [];
  }

  private calcularPeriodo(data: Date, hora: string, duracaoReservaMinutos: number, tempoLimpezaMinutos: number) {
    const [h, m] = hora.split(":").map(Number);
    const inicioReserva = new Date(data);
    inicioReserva.setHours(h, m, 0, 0);
    const fimReserva = new Date(inicioReserva.getTime() + duracaoReservaMinutos * 60_000);
    const fimLimpeza = new Date(fimReserva.getTime() + tempoLimpezaMinutos * 60_000);
    return { inicioReserva, fimReserva, fimLimpeza };
  }

  private parseData(data: string) {
    const [y, mo, d] = data.split("-").map(Number);
    if (Number.isNaN(y) || Number.isNaN(mo) || Number.isNaN(d)) {
      throw new AppError("Data inválida — use YYYY-MM-DD", 400);
    }
    return new Date(y, mo - 1, d);
  }

  private formatDataIso(data: Date) {
    const y = data.getFullYear();
    const m = String(data.getMonth() + 1).padStart(2, "0");
    const d = String(data.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  private formatDataBr(data: Date) {
    const d = String(data.getDate()).padStart(2, "0");
    const m = String(data.getMonth() + 1).padStart(2, "0");
    return `${d}/${m}`;
  }

  private startOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }
}
