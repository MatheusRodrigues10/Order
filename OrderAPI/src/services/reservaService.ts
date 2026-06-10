import { AppError } from "../utils/AppError";
import { ReservaRepository } from "../repositories/reservaRepository";
import { SettingsService } from "./settingsService";
import { formatDateTimeBr } from "../utils/dateFormat";

export class ReservaService {
  constructor(
    private readonly reservaRepository = new ReservaRepository(),
    private readonly settingsService = new SettingsService()
  ) {}

  async cleanupExpired() {
    await this.reservaRepository.deleteExpired();
  }

  async getStatus() {
    await this.cleanupExpired();
    const settings = await this.settingsService.getSettings();
    const mesasReservadas = await this.reservaRepository.count();

    return {
      totalMesas: settings.totalMesas,
      mesasReservadas,
      mesasLivres: settings.totalMesas - mesasReservadas
    };
  }

  async listActive() {
    await this.cleanupExpired();
    const reservas = await this.reservaRepository.list();

    return reservas.map((reserva) => ({
      mesa: reserva.numeroMesa,
      reservadoEm: formatDateTimeBr(reserva.reservadoEm),
      expiraEm: formatDateTimeBr(reserva.expiraEm),
      liberaEm: formatDateTimeBr(reserva.liberaEm),
      emLimpeza: reserva.expiraEm <= new Date()
    }));
  }

  async reserveAuto() {
    await this.cleanupExpired();
    const settings = await this.settingsService.getSettings();
    const reservas = await this.reservaRepository.list();
    const mesasReservadas = new Set(reservas.map((reserva) => reserva.numeroMesa));
    const expiraEm = new Date(Date.now() + settings.duracaoReservaMinutos * 60 * 1000);
    const liberaEm = new Date(expiraEm.getTime() + settings.duracaoLimpezaMinutos * 60 * 1000);

    for (let mesa = 1; mesa <= settings.totalMesas; mesa += 1) {
      if (mesasReservadas.has(mesa)) {
        continue;
      }

      const reserva = await this.reservaRepository.createIfFree(mesa, expiraEm, liberaEm);
      if (reserva) {
        return {
          mesa: reserva.numeroMesa,
          expiraEm: formatDateTimeBr(reserva.expiraEm),
          liberaEm: formatDateTimeBr(reserva.liberaEm)
        };
      }
    }

    throw new AppError("Nenhuma mesa disponível", 409);
  }

  async reserveSpecific(numeroMesa: number) {
    await this.cleanupExpired();
    const settings = await this.settingsService.getSettings();

    if (numeroMesa < 1 || numeroMesa > settings.totalMesas) {
      throw new AppError("Mesa inválida", 400);
    }

    const expiraEm = new Date(Date.now() + settings.duracaoReservaMinutos * 60 * 1000);
    const liberaEm = new Date(expiraEm.getTime() + settings.duracaoLimpezaMinutos * 60 * 1000);
    const reserva = await this.reservaRepository.createIfFree(numeroMesa, expiraEm, liberaEm);

    if (!reserva) {
      throw new AppError("Mesa já está reservada", 409);
    }

    return {
      mesa: reserva.numeroMesa,
      expiraEm: formatDateTimeBr(reserva.expiraEm),
      liberaEm: formatDateTimeBr(reserva.liberaEm)
    };
  }

  async cancel(numeroMesa: number) {
    await this.cleanupExpired();
    const reserva = await this.reservaRepository.findByMesa(numeroMesa);
    if (!reserva) {
      throw new AppError("Reserva não encontrada", 404);
    }

    await this.reservaRepository.deleteByMesa(numeroMesa);
  }
}
