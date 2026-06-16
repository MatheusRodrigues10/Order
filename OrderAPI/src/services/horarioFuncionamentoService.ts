import { AppError } from "../utils/AppError";
import { HorarioFuncionamentoRepository } from "../repositories/horarioFuncionamentoRepository";

const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const TURNO_NOME: Record<number, string> = { 1: "Almoço", 2: "Jantar" };

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
      throw new AppError("Dia da semana inválido (0=Dom a 6=Sab)", 400);
    }
    if (turno !== 1 && turno !== 2) {
      throw new AppError("Turno inválido — use 1 (Almoço) ou 2 (Jantar)", 400);
    }
    this.validateHoraPair(horaAbertura, horaFechamento);

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
   * Valida que a reserva cabe dentro de ao menos um turno ativo do dia.
   * Se não houver nenhum turno configurado, reserva é permitida (política aberta).
   */
  async validarHorarioReserva(inicioEm: Date, fimEm: Date) {
    const diaSemana = inicioEm.getDay();
    const horarios = await this.repo.findByDia(diaSemana);
    const ativos = horarios.filter((h) => h.ativo);

    if (ativos.length === 0) return; // sem restrição configurada

    for (const h of ativos) {
      const [abH, abM] = h.horaAbertura.split(":").map(Number);
      const [fchH, fchM] = h.horaFechamento.split(":").map(Number);

      const abertura = new Date(inicioEm);
      abertura.setHours(abH, abM, 0, 0);

      const fechamento = new Date(inicioEm);
      fechamento.setHours(fchH, fchM, 0, 0);

      if (inicioEm >= abertura && fimEm <= fechamento) {
        return; // cabe neste turno
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
