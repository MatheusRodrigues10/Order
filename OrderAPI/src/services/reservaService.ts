import { AppError } from "../utils/AppError";
import { ReservaRepository } from "../repositories/reservaRepository";
import { SettingsService } from "./settingsService";
import { formatDateTimeBr } from "../utils/dateFormat";

type ReservaPeriodInput = {
  dataReserva?: string;
  horarioInicio?: string;
  duracaoMinutos?: number;
};

type ResolvedPeriod = {
  dataReserva: string;
  horarioInicio: string;
  duracaoMinutos: number;
  inicioEm: Date;
  fimEm: Date;
};

export class ReservaService {
  constructor(
    private readonly reservaRepository = new ReservaRepository(),
    private readonly settingsService = new SettingsService()
  ) {}

  async cleanupExpired() {
    await this.reservaRepository.deleteExpired();
  }

  async getStatus(periodo?: ReservaPeriodInput) {
    await this.cleanupExpired();
    const settings = await this.settingsService.getSettings();
    const periodoReserva = this.resolvePeriodo(periodo, settings.duracaoReservaMinutos);
    const disponibilidade = await this.getDisponibilidade(periodoReserva);
    const mesasReservadas = disponibilidade.assentos.filter((assento) => assento.status !== "available").length;

    return {
      totalMesas: settings.totalMesas,
      mesasReservadas,
      mesasLivres: settings.totalMesas - mesasReservadas,
      dataReserva: periodoReserva.dataReserva,
      horarioInicio: periodoReserva.horarioInicio,
      duracaoMinutos: periodoReserva.duracaoMinutos
    };
  }

  async listActive() {
    await this.cleanupExpired();
    const reservas = await this.reservaRepository.list();
    const now = new Date();

    return reservas.map((reserva) => ({
      id: reserva.id,
      mesa: reserva.numeroMesa,
      reservadoEm: formatDateTimeBr(reserva.reservadoEm),
      inicioEm: formatDateTimeBr(reserva.inicioEm),
      expiraEm: formatDateTimeBr(reserva.expiraEm),
      liberaEm: formatDateTimeBr(reserva.liberaEm),
      duracaoMinutos: reserva.duracaoMinutos,
      emLimpeza: reserva.expiraEm <= now && reserva.liberaEm > now
    }));
  }

  async getDisponibilidade(input: ReservaPeriodInput = {}) {
    await this.cleanupExpired();
    const settings = await this.settingsService.getSettings();
    const periodo = this.resolvePeriodo(input, settings.duracaoReservaMinutos);
    const conflitos = await this.reservaRepository.findConflicts(periodo.inicioEm, periodo.fimEm);
    const conflitosPorMesa = new Map<number, (typeof conflitos)[number]>();

    for (const conflito of conflitos) {
      const conflitoAtual = conflitosPorMesa.get(conflito.numeroMesa);
      if (!conflitoAtual || conflito.inicioEm < conflitoAtual.inicioEm) {
        conflitosPorMesa.set(conflito.numeroMesa, conflito);
      }
    }

    const assentos = Array.from({ length: settings.totalMesas }, (_, index) => {
      const mesa = index + 1;
      const conflito = conflitosPorMesa.get(mesa);

      if (!conflito) {
        return {
          mesa,
          status: "available" as const
        };
      }

      const status =
        conflito.expiraEm > periodo.inicioEm && conflito.inicioEm < periodo.fimEm ? "reserved" : "blocked";

      return {
        mesa,
        status,
        reserva: {
          id: conflito.id,
          inicioEm: formatDateTimeBr(conflito.inicioEm),
          expiraEm: formatDateTimeBr(conflito.expiraEm),
          liberaEm: formatDateTimeBr(conflito.liberaEm)
        }
      };
    });

    return {
      totalMesas: settings.totalMesas,
      dataReserva: periodo.dataReserva,
      horarioInicio: periodo.horarioInicio,
      duracaoMinutos: periodo.duracaoMinutos,
      assentos
    };
  }

  async reserveAuto(input: ReservaPeriodInput = {}) {
    await this.cleanupExpired();
    const settings = await this.settingsService.getSettings();
    const periodo = this.resolvePeriodo(input, settings.duracaoReservaMinutos);
    const disponibilidade = await this.getDisponibilidade(periodo);
    const liberaEm = new Date(periodo.fimEm.getTime() + settings.duracaoLimpezaMinutos * 60 * 1000);

    for (let mesa = 1; mesa <= settings.totalMesas; mesa += 1) {
      const assento = disponibilidade.assentos.find((item) => item.mesa === mesa);
      if (assento?.status !== "available") {
        continue;
      }

      const reserva = await this.reservaRepository.createIfFree(
        mesa,
        periodo.inicioEm,
        periodo.fimEm,
        liberaEm,
        periodo.duracaoMinutos
      );

      if (reserva) {
        return this.formatReserva(reserva);
      }
    }

    throw new AppError("Nenhuma mesa disponivel", 409);
  }

  async reserveSpecific(numeroMesa: number, input: ReservaPeriodInput = {}) {
    await this.cleanupExpired();
    const settings = await this.settingsService.getSettings();
    const periodo = this.resolvePeriodo(input, settings.duracaoReservaMinutos);

    if (numeroMesa < 1 || numeroMesa > settings.totalMesas) {
      throw new AppError("Mesa invalida", 400);
    }

    const liberaEm = new Date(periodo.fimEm.getTime() + settings.duracaoLimpezaMinutos * 60 * 1000);
    const reserva = await this.reservaRepository.createIfFree(
      numeroMesa,
      periodo.inicioEm,
      periodo.fimEm,
      liberaEm,
      periodo.duracaoMinutos
    );

    if (!reserva) {
      throw new AppError("Mesa indisponivel para o periodo selecionado", 409);
    }

    return this.formatReserva(reserva);
  }

  async cancel(id: number) {
    await this.cleanupExpired();
    const reserva = await this.reservaRepository.findById(id);
    if (!reserva) {
      throw new AppError("Reserva nao encontrada", 404);
    }

    await this.reservaRepository.deleteById(id);
  }

  private resolvePeriodo(input: ReservaPeriodInput | Partial<ResolvedPeriod> = {}, defaultDuracao: number) {
    const maybeResolved = input as Partial<ResolvedPeriod>;
    if (
      maybeResolved.inicioEm &&
      maybeResolved.fimEm &&
      maybeResolved.dataReserva &&
      maybeResolved.horarioInicio &&
      maybeResolved.duracaoMinutos
    ) {
      return maybeResolved as ResolvedPeriod;
    }

    const now = new Date();
    const dataReserva = input.dataReserva ?? this.formatDateInput(now);
    const horarioInicio = input.horarioInicio ?? this.formatTimeInput(now);
    const duracaoMinutos = input.duracaoMinutos ?? defaultDuracao;
    const inicioEm = this.parseLocalDateTime(dataReserva, horarioInicio);

    if (Number.isNaN(inicioEm.getTime())) {
      throw new AppError("Data ou horario invalido", 400);
    }

    if (duracaoMinutos <= 0) {
      throw new AppError("Duracao da reserva invalida", 400);
    }

    return {
      dataReserva,
      horarioInicio,
      duracaoMinutos,
      inicioEm,
      fimEm: new Date(inicioEm.getTime() + duracaoMinutos * 60 * 1000)
    };
  }

  private parseLocalDateTime(dataReserva: string, horarioInicio: string) {
    const [year, month, day] = dataReserva.split("-").map(Number);
    const [hour, minute] = horarioInicio.split(":").map(Number);
    return new Date(year, month - 1, day, hour, minute, 0, 0);
  }

  private formatDateInput(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private formatTimeInput(date: Date) {
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  private formatReserva(reserva: {
    id: number;
    numeroMesa: number;
    reservadoEm: Date;
    inicioEm: Date;
    expiraEm: Date;
    liberaEm: Date;
    duracaoMinutos: number;
  }) {
    return {
      id: reserva.id,
      mesa: reserva.numeroMesa,
      reservadoEm: formatDateTimeBr(reserva.reservadoEm),
      inicioEm: formatDateTimeBr(reserva.inicioEm),
      expiraEm: formatDateTimeBr(reserva.expiraEm),
      liberaEm: formatDateTimeBr(reserva.liberaEm),
      duracaoMinutos: reserva.duracaoMinutos
    };
  }
}
