import { randomUUID } from "crypto";
import { AppError } from "../utils/AppError";
import { MesaBloqueadaError, MesaNaoEncontradaError, ReservaNaoEncontradaError } from "../utils/errors";
import { ReservaRepository } from "../repositories/reservaRepository";
import { MesaBloqueioRepository } from "../repositories/mesaBloqueioRepository";
import { EventDayRepository } from "../repositories/eventDayRepository";
import { SettingsService } from "./settingsService";
import { HorarioFuncionamentoService, DIAS_SEMANA } from "./horarioFuncionamentoService";
import { formatDateTimeBr } from "../utils/dateFormat";

export class ReservaService {
  constructor(
    private readonly reservaRepo = new ReservaRepository(),
    private readonly settingsService = new SettingsService(),
    private readonly mesaBloqueioRepo = new MesaBloqueioRepository(),
    private readonly horarioFuncionamentoService = new HorarioFuncionamentoService(),
    private readonly eventDayRepo = new EventDayRepository()
  ) {}

  async cleanupExpired() {
    await this.reservaRepo.deleteExpired();
  }

  // ── Referência de data/hora para a IA (âncora de cálculo) ──────────────────

  async getNow() {
    const now = new Date();
    const diaSemana = now.getDay();
    const pad = (n: number) => String(n).padStart(2, "0");
    const hoje = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const hora = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const turnos = await this.horarioFuncionamentoService.getTurnosAtivosDoDia(diaSemana);

    return {
      hoje,
      diaSemana,
      diaSemanaNome: DIAS_SEMANA[diaSemana],
      hora,
      turnos: turnos.map((t) => ({
        turno: t.turno,
        turnoNome: t.turnoNome,
        horaAbertura: t.horaAbertura,
        horaFechamento: t.horaFechamento
      }))
    };
  }

  // ── Dashboard ───────────────────────────────────────────────────────────────

  async getDashboard() {
    const settings = await this.settingsService.getSettings();
    const now = new Date();
    const activeMesas = await this.reservaRepo.countActiveMesas(now);
    const mesasReservadas = activeMesas.length;
    const bloqueadasSet = await this.mesaBloqueioRepo.getBloqueadasSet();
    const mesasBloqueadas = bloqueadasSet.size;
    return {
      totalMesas: settings.totalMesas,
      mesasLivres: settings.totalMesas - mesasReservadas - mesasBloqueadas,
      mesasReservadas,
      mesasBloqueadas
    };
  }

  // ── Listar todas as mesas com status atual ──────────────────────────────────

  async listarMesas() {
    await this.cleanupExpired();
    const settings = await this.settingsService.getSettings();
    const now = new Date();

    const reservas = await this.reservaRepo.list();
    const bloqueios = await this.mesaBloqueioRepo.findAll();
    const bloqueioByMesa = new Map(bloqueios.map((b) => [b.numeroMesa, b]));

    const reservasByMesa = new Map<number, typeof reservas[number][]>();
    for (const r of reservas) {
      const arr = reservasByMesa.get(r.numeroMesa) ?? [];
      arr.push(r);
      reservasByMesa.set(r.numeroMesa, arr);
    }

    // Build group map: grupoReservaId → list of mesaNumbers
    const grupoMesas = new Map<string, number[]>();
    for (const r of reservas) {
      if (r.grupoReservaId) {
        const arr = grupoMesas.get(r.grupoReservaId) ?? [];
        arr.push(r.numeroMesa);
        grupoMesas.set(r.grupoReservaId, arr);
      }
    }

    const mesas = [];
    for (let numero = 1; numero <= settings.totalMesas; numero++) {
      const bloqueio = bloqueioByMesa.get(numero);
      if (bloqueio) {
        mesas.push({
          numero,
          status: "blocked" as const,
          reserva: null,
          bloqueio: {
            bloqueadaPor: bloqueio.bloqueadaPor,
            motivo: bloqueio.motivo,
            bloqueadaEm: formatDateTimeBr(bloqueio.bloqueadaEm)
          }
        });
        continue;
      }

      const mesaReservas = reservasByMesa.get(numero) ?? [];

      const activeReserva = mesaReservas.find(
        (r) => r.inicioReserva <= now && r.fimLimpeza > now
      );

      if (activeReserva) {
        const status =
          now >= activeReserva.inicioReserva && now < activeReserva.fimReserva
            ? ("occupied" as const)
            : ("cleaning" as const);

        const mesasJuntadas = activeReserva.grupoReservaId
          ? (grupoMesas.get(activeReserva.grupoReservaId) ?? [])
              .filter((m) => m !== numero)
              .sort((a, b) => a - b)
          : [];

        mesas.push({
          numero,
          status,
          reserva: {
            id: activeReserva.id,
            grupoReservaId: activeReserva.grupoReservaId,
            mesasJuntadas,
            quantidadePessoas: activeReserva.quantidadePessoas,
            nomeCliente: activeReserva.nomeCliente,
            telefone: activeReserva.telefone,
            inicioReserva: activeReserva.inicioReserva.toISOString(),
            fimReserva: activeReserva.fimReserva.toISOString(),
            fimLimpeza: activeReserva.fimLimpeza.toISOString()
          },
          bloqueio: null
        });
        continue;
      }

      const futureReserva = mesaReservas.find((r) => r.inicioReserva > now);
      if (futureReserva) {
        const mesasJuntadas = futureReserva.grupoReservaId
          ? (grupoMesas.get(futureReserva.grupoReservaId) ?? [])
              .filter((m) => m !== numero)
              .sort((a, b) => a - b)
          : [];

        mesas.push({
          numero,
          status: "reserved" as const,
          reserva: {
            id: futureReserva.id,
            grupoReservaId: futureReserva.grupoReservaId,
            mesasJuntadas,
            quantidadePessoas: futureReserva.quantidadePessoas,
            nomeCliente: futureReserva.nomeCliente,
            telefone: futureReserva.telefone,
            inicioReserva: futureReserva.inicioReserva.toISOString(),
            fimReserva: futureReserva.fimReserva.toISOString(),
            fimLimpeza: futureReserva.fimLimpeza.toISOString()
          },
          bloqueio: null
        });
        continue;
      }

      mesas.push({ numero, status: "available" as const, reserva: null, bloqueio: null });
    }

    return mesas;
  }

  // ── Status API (external) ───────────────────────────────────────────────────

async getStatusApi(data: string, hora: string) {
  await this.cleanupExpired();

  const settings = await this.settingsService.getSettings();

  const dataHoraReserva = new Date(`${data}T${hora}:00`);
  const agora = new Date();

  if (dataHoraReserva < agora) {
    return {
      totalMesas: settings.totalMesas,
      mesasDisponiveis: 0,
      mesasIndisponiveis: settings.totalMesas,
      mensagem: 'Não é possível listar mesas disponíveis para uma data ou horário que já passou.',
    };
  }

  const { inicioReserva, fimReserva, fimLimpeza } = this.calcularPeriodo(
    data,
    hora,
    settings.duracaoReservaMinutos,
    settings.tempoLimpezaMinutos
  );

  const conflitos = await this.reservaRepo.findConflicts(inicioReserva, fimLimpeza);
  const mesasComConflito = new Set(conflitos.map((c) => c.numeroMesa));
  const bloqueadas = await this.mesaBloqueioRepo.getBloqueadasSet();

  let mesasDisponiveis = 0;
  let mesasIndisponiveis = 0;

  for (let mesa = 1; mesa <= settings.totalMesas; mesa++) {
    if (mesasComConflito.has(mesa) || bloqueadas.has(mesa)) {
      mesasIndisponiveis++;
    } else {
      mesasDisponiveis++;
    }
  }

  return {
    totalMesas: settings.totalMesas,
    mesasDisponiveis,
    mesasIndisponiveis,
  };
}

  // ── Disponibilidade por intervalo de dias (external) ────────────────────────

async getDisponibilidade(
  quantidadePessoas: number,
  dataInicio?: string,
  dataFim?: string,
  duracaoMinutos?: number
) {
  await this.cleanupExpired();

  const settings = await this.settingsService.getSettings();

  const mesasNecessarias = Math.ceil(quantidadePessoas / settings.lugaresPorMesa);

  if (mesasNecessarias > settings.totalMesas) {
    throw new AppError(
      `Quantidade de pessoas excede a capacidade total do restaurante`,
      400
    );
  }

  if (duracaoMinutos !== undefined && duracaoMinutos > settings.duracaoReservaMinutos) {
    throw new AppError(
      `Duração máxima permitida é ${settings.duracaoReservaMinutos} minutos`,
      400
    );
  }

  const duracaoDesejada = duracaoMinutos ?? settings.duracaoReservaMinutos;

  const inicio = dataInicio ? this.parseData(dataInicio) : this.hojeAsData();
  const fim = dataFim ? this.parseData(dataFim) : this.addDias(inicio, 6);

  if (fim < inicio) {
    throw new AppError("'dataFim' não pode ser anterior a 'dataInicio'", 400);
  }

  const totalDias = this.diffDias(inicio, fim) + 1;

  if (totalDias > 14) {
    throw new AppError("Intervalo máximo de consulta é 14 dias", 400);
  }

  const dias: Array<{
    data: string;
    diaSemanaNome: string;
    horarios: Array<{ hora: string; duracaoMaximaMinutos: number }>;
  }> = [];

  const bloqueadasDisp = await this.mesaBloqueioRepo.getBloqueadasSet();

  for (let i = 0; i < totalDias; i++) {
    const diaAtual = this.addDias(inicio, i);
    const diaSemana = diaAtual.getDay();

    const pad = (n: number) => String(n).padStart(2, "0");

    const dataStr = `${diaAtual.getFullYear()}-${pad(diaAtual.getMonth() + 1)}-${pad(
      diaAtual.getDate()
    )}`;

    const isEvento = await this.eventDayRepo.isEventDay(dataStr);
    if (isEvento) continue;

    let turnos = await this.horarioFuncionamentoService.getTurnosAtivosDoDia(diaSemana);

    if (turnos.length === 0) {
      turnos = [
        {
          id: 0,
          diaSemana,
          diaNome: DIAS_SEMANA[diaSemana],
          turno: 0,
          turnoNome: "Geral",
          horaAbertura: settings.horarioAbertura,
          horaFechamento: settings.horarioFechamento,
          ativo: true,
        },
      ];
    }

    const horariosDoDia: Array<{ hora: string; duracaoMaximaMinutos: number }> = [];

    for (const turno of turnos) {
      const candidatos = this.gerarSlotsCandidatos(
        diaAtual,
        turno.horaAbertura,
        turno.horaFechamento
      );

      for (const slot of candidatos) {
        if (slot < new Date()) continue;

        const minutosAteFechamento = this.minutosAteFechamento(
          slot,
          diaAtual,
          turno.horaFechamento
        );

        const duracaoMaximaSlot = Math.min(duracaoDesejada, minutosAteFechamento);

        if (duracaoMaximaSlot < 30) continue;

        const fimLimpezaSlot = new Date(
          slot.getTime() + (duracaoMaximaSlot + settings.tempoLimpezaMinutos) * 60_000
        );

        const conflitos = await this.reservaRepo.findConflicts(slot, fimLimpezaSlot);

        const mesasComConflito = new Set(conflitos.map((c) => c.numeroMesa));

        const mesasIndisponiveisSet = new Set<number>([
          ...mesasComConflito,
          ...bloqueadasDisp,
        ]);

        const mesasLivres = settings.totalMesas - mesasIndisponiveisSet.size;

        const temMesasSuficientes = mesasLivres >= mesasNecessarias;

        if (!temMesasSuficientes) continue;

        horariosDoDia.push({
          hora: `${pad(slot.getHours())}:${pad(slot.getMinutes())}`,
          duracaoMaximaMinutos: duracaoMaximaSlot,
        });
      }
    }

    if (horariosDoDia.length > 0) {
      dias.push({
        data: dataStr,
        diaSemanaNome: DIAS_SEMANA[diaSemana],
        horarios: horariosDoDia,
      });
    }
  }

  return { dias };
}

  // ── Listar reservas ─────────────────────────────────────────────────────────

  async listActive() {
    await this.cleanupExpired();
    return this.reservaRepo.list();
  }

  // ── Criar reserva automática ────────────────────────────────────────────────

async reserveAuto(
  quantidadePessoas: number,
  data: string,
  hora: string,
  duracaoMinutos: number | undefined,
  nomeCliente: string,
  telefone: string
) {
  await this.cleanupExpired();

  const settings = await this.settingsService.getSettings();

  const mesasNecessarias = Math.ceil(quantidadePessoas / settings.lugaresPorMesa);

  if (mesasNecessarias > settings.totalMesas) {
    throw new AppError(
      "Quantidade de pessoas excede a capacidade total do restaurante",
      400
    );
  }

  if (duracaoMinutos !== undefined && duracaoMinutos > settings.duracaoReservaMinutos) {
    throw new AppError(
      `Duração máxima permitida é ${settings.duracaoReservaMinutos} minutos`,
      400
    );
  }

  const duracao = duracaoMinutos ?? settings.duracaoReservaMinutos;

  const { inicioReserva, fimReserva, fimLimpeza } = this.calcularPeriodo(
    data,
    hora,
    duracao,
    settings.tempoLimpezaMinutos
  );

  if (inicioReserva < new Date()) {
    throw new AppError("Não é possível reservar em horário que já passou", 400);
  }

  const isEvento = await this.eventDayRepo.isEventDay(data);

  if (isEvento) {
    throw new AppError("Restaurante fechado para evento neste dia", 409);
  }

  this.validarHorario(
    inicioReserva,
    fimLimpeza,
    settings.horarioAbertura,
    settings.horarioFechamento
  );

  await this.horarioFuncionamentoService.validarHorarioReserva(
    inicioReserva,
    fimReserva
  );

  const conflitos = await this.reservaRepo.findConflicts(inicioReserva, fimLimpeza);
  const mesasComConflito = new Set(conflitos.map((c) => c.numeroMesa));

  const bloqueadas = await this.mesaBloqueioRepo.getBloqueadasSet();

  const mesasLivres: number[] = [];

  for (let mesa = 1; mesa <= settings.totalMesas; mesa++) {
    if (mesasComConflito.has(mesa) || bloqueadas.has(mesa)) continue;

    mesasLivres.push(mesa);
  }

  if (mesasLivres.length < mesasNecessarias) {
    throw new AppError("Não há mesas suficientes disponíveis para essa quantidade de pessoas", 409);
  }

  const grupoReservaId = mesasNecessarias > 1 ? randomUUID() : undefined;
  const reservasCriadas = [];

  for (const mesa of mesasLivres) {
    if (reservasCriadas.length >= mesasNecessarias) break;

    const reserva = await this.reservaRepo.createIfFree({
      numeroMesa: mesa,
      grupoReservaId,
      quantidadePessoas,
      nomeCliente,
      telefone,
      inicioReserva,
      fimReserva,
      fimLimpeza
    });

    if (reserva) {
      reservasCriadas.push(reserva);
    }
  }

  if (reservasCriadas.length < mesasNecessarias) {
    if (grupoReservaId && reservasCriadas.length > 0) {
      await this.reservaRepo.deleteByGrupoId(grupoReservaId);
    }
    throw new AppError("Não foi possível reservar mesas suficientes", 409);
  }

  return {
    ids: reservasCriadas.map((reserva) => reserva.id),
    mesas: reservasCriadas.map((reserva) => reserva.numeroMesa),
    quantidadePessoas,
    mesasNecessarias,
    inicio: inicioReserva,
    fim: fimReserva,
    fimLimpeza
  };
}

  // ── Criar reserva específica (admin) ────────────────────────────────────────

  async reserveSpecific(
    numeroMesa: number,
    quantidadePessoas: number,
    data: string,
    hora: string,
    nomeCliente: string,
    telefone: string,
    duracaoMinutos?: number
  ) {
    await this.cleanupExpired();
    const settings = await this.settingsService.getSettings();

    if (numeroMesa < 1 || numeroMesa > settings.totalMesas) {
      throw new MesaNaoEncontradaError(numeroMesa);
    }

    const duracao = duracaoMinutos ?? settings.duracaoReservaMinutos;
    if (duracao > settings.duracaoReservaMinutos) {
      throw new AppError(
        `Duração máxima permitida é ${settings.duracaoReservaMinutos} minutos`,
        400
      );
    }

    const tablesNeeded = Math.ceil(quantidadePessoas / settings.lugaresPorMesa);

    const { inicioReserva, fimReserva, fimLimpeza } = this.calcularPeriodo(
      data, hora, duracao, settings.tempoLimpezaMinutos
    );

    if (inicioReserva < new Date()) {
      throw new AppError("Não é possível reservar em horário que já passou", 400);
    }

    const isEvento = await this.eventDayRepo.isEventDay(data);
    if (isEvento) {
      throw new AppError("Restaurante fechado para evento neste dia", 409);
    }

    this.validarHorario(inicioReserva, fimLimpeza, settings.horarioAbertura, settings.horarioFechamento);
    await this.horarioFuncionamentoService.validarHorarioReserva(inicioReserva, fimReserva);

    const bloqueadasSet = await this.mesaBloqueioRepo.getBloqueadasSet();
    if (bloqueadasSet.has(numeroMesa)) {
      throw new MesaBloqueadaError(numeroMesa);
    }

    if (tablesNeeded <= 1) {
      // Single table reservation
      this.validarCapacidade(quantidadePessoas, settings.lugaresPorMesa);

      const reserva = await this.reservaRepo.createIfFree({
        numeroMesa,
        quantidadePessoas,
        nomeCliente,
        telefone,
        inicioReserva,
        fimReserva,
        fimLimpeza
      });

      if (!reserva) {
        throw new AppError(`Mesa ${numeroMesa} não está disponível nesse horário`, 409);
      }

      return {
        ids: [reserva.id],
        mesas: [reserva.numeroMesa],
        inicio: reserva.inicioReserva,
        fim: reserva.fimReserva,
        fimLimpeza: reserva.fimLimpeza
      };
    }

    // Multi-table reservation: use consecutive tables starting from numeroMesa
    const lastMesa = numeroMesa + tablesNeeded - 1;
    if (lastMesa > settings.totalMesas) {
      throw new AppError(
        `Para ${quantidadePessoas} pessoas são necessárias ${tablesNeeded} mesas consecutivas (${numeroMesa}–${lastMesa}), mas o restaurante tem apenas ${settings.totalMesas} mesas`,
        400
      );
    }

    const mesasNecessarias = Array.from({ length: tablesNeeded }, (_, i) => numeroMesa + i);

    const conflitos = await this.reservaRepo.findConflicts(inicioReserva, fimLimpeza);
    const mesasComConflito = new Set(conflitos.map((c) => c.numeroMesa));
    const bloqueadas = await this.mesaBloqueioRepo.getBloqueadasSet();

    const mesasIndisponiveis = mesasNecessarias.filter(
      (m) => mesasComConflito.has(m) || bloqueadas.has(m)
    );

    if (mesasIndisponiveis.length > 0) {
      throw new AppError(
        `As mesas ${mesasIndisponiveis.join(", ")} não estão disponíveis no horário solicitado`,
        409
      );
    }

    const grupoReservaId = randomUUID();
    const reservasCriadas = [];

    for (const mesa of mesasNecessarias) {
      const reserva = await this.reservaRepo.createIfFree({
        numeroMesa: mesa,
        grupoReservaId,
        quantidadePessoas,
        nomeCliente,
        telefone,
        inicioReserva,
        fimReserva,
        fimLimpeza
      });

      if (!reserva) {
        // Race condition: rollback already created reservations
        await this.reservaRepo.deleteByGrupoId(grupoReservaId);
        throw new AppError(`Mesa ${mesa} ficou indisponível durante a criação da reserva`, 409);
      }

      reservasCriadas.push(reserva);
    }

    return {
      ids: reservasCriadas.map((r) => r.id),
      mesas: reservasCriadas.map((r) => r.numeroMesa),
      inicio: reservasCriadas[0].inicioReserva,
      fim: reservasCriadas[0].fimReserva,
      fimLimpeza: reservasCriadas[0].fimLimpeza
    };
  }

  // ── Cancelar reserva ────────────────────────────────────────────────────────

  async cancel(id: number) {
    const reserva = await this.reservaRepo.findById(id);
    if (!reserva) throw new ReservaNaoEncontradaError(id);

    if (reserva.grupoReservaId) {
      await this.reservaRepo.deleteByGrupoId(reserva.grupoReservaId);
    } else {
      await this.reservaRepo.deleteById(id);
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private calcularPeriodo(data: string, hora: string, duracaoReservaMinutos: number, tempoLimpezaMinutos: number) {
    const [y, mo, d] = data.split("-").map(Number);
    const [h, m] = hora.split(":").map(Number);

    if (Number.isNaN(y) || Number.isNaN(mo) || Number.isNaN(d) || Number.isNaN(h) || Number.isNaN(m)) {
      throw new AppError("Data ou hora inválida", 400);
    }

    const inicioReserva = new Date(y, mo - 1, d, h, m, 0, 0);
    const fimReserva = new Date(inicioReserva.getTime() + duracaoReservaMinutos * 60_000);
    const fimLimpeza = new Date(fimReserva.getTime() + tempoLimpezaMinutos * 60_000);

    return { inicioReserva, fimReserva, fimLimpeza };
  }

  private validarCapacidade(quantidadePessoas: number, lugaresPorMesa: number) {
    if (quantidadePessoas > lugaresPorMesa) {
      throw new AppError(
        `Capacidade máxima por mesa é ${lugaresPorMesa} pessoas`,
        400
      );
    }
  }

  private validarHorario(inicioReserva: Date, fimLimpeza: Date, horarioAbertura: string, horarioFechamento: string) {
    const toMin = (h: number, m: number) => h * 60 + m;

    const [abH, abM] = horarioAbertura.split(":").map(Number);
    const [feH, feM] = horarioFechamento.split(":").map(Number);

    const aberturaMin = toMin(abH, abM);
    const fechamentoMin = toMin(feH, feM);
    const inicioMin = toMin(inicioReserva.getHours(), inicioReserva.getMinutes());
    const fimMin = toMin(fimLimpeza.getHours(), fimLimpeza.getMinutes());

    if (inicioMin < aberturaMin) {
      throw new AppError(`Reservas iniciam a partir das ${horarioAbertura}`, 400);
    }

    if (fimMin > fechamentoMin) {
      throw new AppError(
        `A reserva ultrapassaria o horário de fechamento (${horarioFechamento})`,
        400
      );
    }
  }

  private parseData(data: string): Date {
    const dataRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dataRegex.test(data)) {
      throw new AppError("Formato de data inválido, use YYYY-MM-DD", 400);
    }
    const [y, mo, d] = data.split("-").map(Number);
    const parsed = new Date(y, mo - 1, d, 0, 0, 0, 0);
    if (Number.isNaN(parsed.getTime())) {
      throw new AppError("Data inválida", 400);
    }
    return parsed;
  }

  private hojeAsData(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  }

  private addDias(data: Date, dias: number): Date {
    const result = new Date(data);
    result.setDate(result.getDate() + dias);
    return result;
  }

  private diffDias(inicio: Date, fim: Date): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.round((fim.getTime() - inicio.getTime()) / msPerDay);
  }

  /**
   * Gera horários candidatos de 30 em 30 minutos dentro de um turno, para um dia específico.
   */
  private gerarSlotsCandidatos(dia: Date, horaAbertura: string, horaFechamento: string): Date[] {
    const [abH, abM] = horaAbertura.split(":").map(Number);
    const [feH, feM] = horaFechamento.split(":").map(Number);

    const slots: Date[] = [];
    let cursor = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), abH, abM, 0, 0);
    const fechamento = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), feH, feM, 0, 0);

    while (cursor < fechamento) {
      slots.push(new Date(cursor));
      cursor = new Date(cursor.getTime() + 30 * 60_000);
    }

    return slots;
  }

  /**
   * Minutos entre um horário candidato e o fechamento do turno correspondente.
   */
  private minutosAteFechamento(slot: Date, dia: Date, horaFechamento: string): number {
    const [feH, feM] = horaFechamento.split(":").map(Number);
    const fechamento = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), feH, feM, 0, 0);
    return Math.floor((fechamento.getTime() - slot.getTime()) / 60_000);
  }
}
