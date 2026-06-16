import { randomUUID } from "crypto";
import { AppError } from "../utils/AppError";
import { ReservaRepository } from "../repositories/reservaRepository";
import { MesaBloqueioRepository } from "../repositories/mesaBloqueioRepository";
import { SettingsService } from "./settingsService";
import { HorarioFuncionamentoService } from "./horarioFuncionamentoService";
import { formatDateTimeBr } from "../utils/dateFormat";

export class ReservaService {
  constructor(
    private readonly reservaRepo = new ReservaRepository(),
    private readonly settingsService = new SettingsService(),
    private readonly mesaBloqueioRepo = new MesaBloqueioRepository(),
    private readonly horarioFuncionamentoService = new HorarioFuncionamentoService()
  ) {}

  async cleanupExpired() {
    await this.reservaRepo.deleteExpired();
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
    const { inicioReserva, fimReserva, fimLimpeza } = this.calcularPeriodo(data, hora, settings.duracaoReservaMinutos, settings.tempoLimpezaMinutos);

    const conflitos = await this.reservaRepo.findConflicts(inicioReserva, fimLimpeza);
    const mesasComConflito = new Set(conflitos.map((c) => c.numeroMesa));

    let mesasDisponiveis = 0;
    let mesasIndisponiveis = 0;
    for (let mesa = 1; mesa <= settings.totalMesas; mesa++) {
      if (mesasComConflito.has(mesa)) {
        mesasIndisponiveis++;
      } else {
        mesasDisponiveis++;
      }
    }

    return { totalMesas: settings.totalMesas, mesasDisponiveis, mesasIndisponiveis };
  }

  // ── Listar reservas ─────────────────────────────────────────────────────────

  async listActive() {
    await this.cleanupExpired();
    return this.reservaRepo.list();
  }

  // ── Criar reserva automática ────────────────────────────────────────────────

  async reserveAuto(quantidadePessoas: number, data: string, hora: string, nomeCliente?: string, telefone?: string) {
    await this.cleanupExpired();
    const settings = await this.settingsService.getSettings();

    this.validarCapacidade(quantidadePessoas, settings.lugaresPorMesa);

    const { inicioReserva, fimReserva, fimLimpeza } = this.calcularPeriodo(data, hora, settings.duracaoReservaMinutos, settings.tempoLimpezaMinutos);

    if (inicioReserva < new Date()) {
      throw new AppError("Não é possível reservar em horário que já passou", 400);
    }

    this.validarHorario(inicioReserva, fimLimpeza, settings.horarioAbertura, settings.horarioFechamento);
    await this.horarioFuncionamentoService.validarHorarioReserva(inicioReserva, fimLimpeza);

    const conflitos = await this.reservaRepo.findConflicts(inicioReserva, fimLimpeza);
    const mesasComConflito = new Set(conflitos.map((c) => c.numeroMesa));

    for (let mesa = 1; mesa <= settings.totalMesas; mesa++) {
      if (mesasComConflito.has(mesa)) continue;

      const reserva = await this.reservaRepo.createIfFree({
        numeroMesa: mesa,
        quantidadePessoas,
        nomeCliente,
        telefone,
        inicioReserva,
        fimReserva,
        fimLimpeza
      });

      if (reserva) {
        return {
          mesas: [reserva.numeroMesa],
          inicio: reserva.inicioReserva,
          fim: reserva.fimReserva,
          fimLimpeza: reserva.fimLimpeza
        };
      }
    }

    throw new AppError("Nenhuma mesa disponível", 409);
  }

  // ── Criar reserva específica (admin) ────────────────────────────────────────

  async reserveSpecific(
    numeroMesa: number,
    quantidadePessoas: number,
    data: string,
    hora: string,
    nomeCliente?: string,
    telefone?: string
  ) {
    await this.cleanupExpired();
    const settings = await this.settingsService.getSettings();

    if (numeroMesa < 1 || numeroMesa > settings.totalMesas) {
      throw new AppError(`Mesa ${numeroMesa} não existe`, 400);
    }

    const tablesNeeded = Math.ceil(quantidadePessoas / settings.lugaresPorMesa);

    const { inicioReserva, fimReserva, fimLimpeza } = this.calcularPeriodo(
      data, hora, settings.duracaoReservaMinutos, settings.tempoLimpezaMinutos
    );

    if (inicioReserva < new Date()) {
      throw new AppError("Não é possível reservar em horário que já passou", 400);
    }

    this.validarHorario(inicioReserva, fimLimpeza, settings.horarioAbertura, settings.horarioFechamento);
    await this.horarioFuncionamentoService.validarHorarioReserva(inicioReserva, fimLimpeza);

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
      mesas: reservasCriadas.map((r) => r.numeroMesa),
      inicio: reservasCriadas[0].inicioReserva,
      fim: reservasCriadas[0].fimReserva,
      fimLimpeza: reservasCriadas[0].fimLimpeza
    };
  }

  // ── Cancelar reserva ────────────────────────────────────────────────────────

  async cancel(id: number) {
    const reserva = await this.reservaRepo.findById(id);
    if (!reserva) throw new AppError("Reserva não encontrada", 404);

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
}
