import { AppError } from "../utils/AppError";
import { ReservaRepository } from "../repositories/reservaRepository";
import { SettingsRepository } from "../repositories/settingsRepository";

export class SettingsService {
  constructor(
    private readonly repo = new SettingsRepository(),
    private readonly reservaRepo = new ReservaRepository()
  ) {}

  getSettings() {
    return this.repo.find();
  }

  async updateTotalMesas(totalMesas: number) {
    const highest = await this.reservaRepo.findHighestReservedMesa();
    if (highest && highest.numeroMesa > totalMesas) {
      throw new AppError("Existem reservas ativas acima da nova quantidade de mesas", 409);
    }
    return this.repo.updateTotalMesas(totalMesas);
  }

  updateLugaresPorMesa(lugaresPorMesa: number) {
    return this.repo.updateLugaresPorMesa(lugaresPorMesa);
  }

  updateDuracaoReservaMinutos(duracaoReservaMinutos: number) {
    return this.repo.updateDuracaoReservaMinutos(duracaoReservaMinutos);
  }

  updateTempoLimpezaMinutos(tempoLimpezaMinutos: number) {
    return this.repo.updateTempoLimpezaMinutos(tempoLimpezaMinutos);
  }

  async updateHorario(abertura: string, fechamento: string) {
    const [abH, abM] = abertura.split(":").map(Number);
    const [feH, feM] = fechamento.split(":").map(Number);
    if (abH * 60 + abM >= feH * 60 + feM) {
      throw new AppError("Horário de abertura deve ser anterior ao fechamento", 400);
    }
    return this.repo.updateHorario(abertura, fechamento);
  }

  async updatePin(pin: string) {
    return this.repo.updatePin(pin);
  }
}
