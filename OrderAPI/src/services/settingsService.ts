import { AppError } from "../utils/AppError";
import { ReservaRepository } from "../repositories/reservaRepository";
import { SettingsRepository } from "../repositories/settingsRepository";

export class SettingsService {
  constructor(
    private readonly settingsRepository = new SettingsRepository(),
    private readonly reservaRepository = new ReservaRepository()
  ) {}

  getSettings() {
    return this.settingsRepository.find();
  }

  async updateTotalMesas(totalMesas: number) {
    const highestReserva = await this.reservaRepository.findHighestReservedMesa();
    if (highestReserva && highestReserva.numeroMesa > totalMesas) {
      throw new AppError("Existem reservas ativas acima da nova quantidade de mesas", 409);
    }

    return this.settingsRepository.updateTotalMesas(totalMesas);
  }

  updateDuracaoReservaMinutos(duracaoMinutos: number) {
    return this.settingsRepository.updateDuracaoReservaMinutos(duracaoMinutos);
  }

  updateDuracaoLimpezaMinutos(duracaoMinutos: number) {
    return this.settingsRepository.updateDuracaoLimpezaMinutos(duracaoMinutos);
  }
}
