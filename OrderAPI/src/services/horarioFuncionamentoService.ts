import { AppError } from "../utils/AppError";
import { brasiliaComponents, brasiliaToUTC } from "../utils/dateFormat";
import { HorarioFuncionamentoRepository } from "../repositories/horarioFuncionamentoRepository";

export const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
export const TURNO_NOME: Record<number, string> = { 1: "Almoço", 2: "Jantar" };

export class HorarioFuncionamentoService {
  constructor(
    private readonly repo = new HorarioFuncionamentoRepository()
  ) {}

  async listar() {
    const horarios = await this.repo.findAll();
    return horarios.map(this.formatHorario);
  }

  async salvar(diaSemana: number, turno: number, horaAbertura: string, horaFechamento: string, ativo: boolean) {
    if (diaSemana < 0 || diaSemana > 6) {
      throw new AppError("Dia da semana inválido (0=Dom a 6=Sáb)", 400);
    }
    if (turno !== 1 && turno !== 2) {
      throw new AppError("Turno inválido — use 1 (Almoço) ou 2 (Jantar)", 400);
    }
    this.validateHoraPair(horaAbertura, horaFechamento);

    // Se for turno 1, verificar se o novo fechamento não invade o turno 2 já configurado
    if (turno === 1) {
      const turno2 = await this.repo.findByDiaTurno(diaSemana, 2);
      if (turno2 && turno2.ativo) {
        const [f1H, f1M] = horaFechamento.split(":").map(Number);
        const [ab2H, ab2M] = turno2.horaAbertura.split(":").map(Number);
        if (f1H * 60 + f1M >= ab2H * 60 + ab2M) {
          throw new AppError(
            `Fim do 1º turno (${horaFechamento}) invade o início do 2º turno configurado (${turno2.horaAbertura}). Remova o 2º turno antes ou reduza o horário do 1º turno.`,
            400
          );
        }
      }
    }

    // Se for turno 2, verificar se não há sobreposição com turno 1
    if (turno === 2) {
      const turno1 = await this.repo.findByDiaTurno(diaSemana, 1);
      if (turno1 && turno1.ativo) {
        const [f1H, f1M] = turno1.horaFechamento.split(":").map(Number);
        const [ab2H, ab2M] = horaAbertura.split(":").map(Number);
        if (ab2H * 60 + ab2M <= f1H * 60 + f1M) {
          throw new AppError(
            `Início do 2º turno (${horaAbertura}) deve ser após o fim do 1º turno (${turno1.horaFechamento})`,
            400
          );
        }
      }
    }

    const horario = await this.repo.upsert(diaSemana, turno, horaAbertura, horaFechamento, ativo);
    return this.formatHorario(horario);
  }

  async remover(diaSemana: number, turno: number) {
    const existing = await this.repo.findByDiaTurno(diaSemana, turno);
    if (!existing) throw new AppError("Horário de funcionamento não encontrado", 404);
    await this.repo.delete(diaSemana, turno);
  }

  /**
   * Retorna os turnos ativos configurados para um dia da semana, já formatados.
   * Não aplica fallback — quem chama decide o que fazer se vier vazio.
   */
  async getTurnosAtivosDoDia(diaSemana: number) {
    const horarios = await this.repo.findByDia(diaSemana);
    return horarios.filter((h) => h.ativo).map(this.formatHorario);
  }

  /**
   * Valida que a reserva cabe dentro de ao menos um turno ativo do dia.
   * Se não houver nenhum turno configurado, reserva é permitida (política aberta).
   */
  async validarHorarioReserva(inicioEm: Date, fimEm: Date) {
    const c = brasiliaComponents(inicioEm);
    const pad = (n: number) => String(n).padStart(2, "0");
    const dataBrt = `${c.year}-${pad(c.month)}-${pad(c.day)}`;
    const diaSemana = new Date(c.year, c.month - 1, c.day).getDay();

    const horarios = await this.repo.findByDia(diaSemana);
    const ativos = horarios.filter((h) => h.ativo);

    if (ativos.length === 0) return;

    for (const h of ativos) {
      const abertura = brasiliaToUTC(dataBrt, h.horaAbertura);
      const fechamento = brasiliaToUTC(dataBrt, h.horaFechamento);

      if (inicioEm >= abertura && fimEm <= fechamento) {
        return;
      }
    }

    const turnosStr = ativos
      .map((h) => `${TURNO_NOME[h.turno] ?? `Turno ${h.turno}`}: ${h.horaAbertura}–${h.horaFechamento}`)
      .join(", ");
    throw new AppError(
      `Reserva fora dos horários de funcionamento (${turnosStr})`,
      409
    );
  }

  private validateHoraPair(abertura: string, fechamento: string) {
    const [abH, abM] = abertura.split(":").map(Number);
    const [fchH, fchM] = fechamento.split(":").map(Number);
    if (fchH * 60 + fchM <= abH * 60 + abM) {
      throw new AppError("Horário de fechamento deve ser após o horário de abertura", 400);
    }
  }

  private formatHorario(h: {
    id: number;
    diaSemana: number;
    turno: number;
    horaAbertura: string;
    horaFechamento: string;
    ativo: boolean;
  }) {
    return {
      id: h.id,
      diaSemana: h.diaSemana,
      diaNome: DIAS_SEMANA[h.diaSemana],
      turno: h.turno,
      turnoNome: TURNO_NOME[h.turno] ?? `Turno ${h.turno}`,
      horaAbertura: h.horaAbertura,
      horaFechamento: h.horaFechamento,
      ativo: h.ativo
    };
  }
}
