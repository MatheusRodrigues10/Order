import { MesaBloqueioRepository } from "../repositories/mesaBloqueioRepository";
import { ReservaRepository } from "../repositories/reservaRepository";
import { SettingsService } from "./settingsService";
import { BloqueioInvalidoError, DesbloqueioInvalidoError, MesaNaoEncontradaError } from "../utils/errors";
import { formatDateTimeBr } from "../utils/dateFormat";

export class MesaBloqueioService {
  constructor(
    private readonly repo = new MesaBloqueioRepository(),
    private readonly settingsService = new SettingsService(),
    private readonly reservaRepository = new ReservaRepository()
  ) {}

  async listar() {
    const bloqueios = await this.repo.findAll();
    return bloqueios.map((b) => ({
      numeroMesa: b.numeroMesa,
      bloqueadaPor: b.bloqueadaPor,
      motivo: b.motivo,
      bloqueadaEm: formatDateTimeBr(b.bloqueadaEm)
    }));
  }

  async bloquear(numeroMesa: number, bloqueadaPor: string, motivo?: string) {
    const settings = await this.settingsService.getSettings();

    if (numeroMesa < 1 || numeroMesa > settings.totalMesas) {
      throw new MesaNaoEncontradaError(numeroMesa);
    }

    const existing = await this.repo.findByNumero(numeroMesa);
    if (existing) {
      throw new BloqueioInvalidoError(`Mesa ${numeroMesa} já está bloqueada`, { numeroMesa });
    }

    const bloqueio = await this.repo.block(numeroMesa, bloqueadaPor, motivo);
    return {
      numeroMesa: bloqueio.numeroMesa,
      bloqueadaPor: bloqueio.bloqueadaPor,
      motivo: bloqueio.motivo,
      bloqueadaEm: formatDateTimeBr(bloqueio.bloqueadaEm)
    };
  }

  async desbloquear(numeroMesa: number) {
    const existing = await this.repo.findByNumero(numeroMesa);
    if (!existing) {
      throw new DesbloqueioInvalidoError(`Mesa ${numeroMesa} não está bloqueada`, { numeroMesa });
    }

    await this.repo.unblock(numeroMesa);
  }

  getBloqueadasSet(): Promise<Set<number>> {
    return this.repo.getBloqueadasSet();
  }
}
