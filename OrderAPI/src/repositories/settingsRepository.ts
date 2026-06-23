import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma";

const DEFAULT_PIN_HASH = bcrypt.hashSync(process.env.DEFAULT_API_PIN ?? "123456", 12);

export class SettingsRepository {
  find() {
    return prisma.settings.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        totalMesas: 70,
        lugaresPorMesa: 4,
        duracaoReservaMinutos: 120,
        tempoLimpezaMinutos: 30,
        horarioAbertura: "11:00",
        horarioFechamento: "23:00",
        apiPin: DEFAULT_PIN_HASH
      }
    });
  }

  updateTotalMesas(totalMesas: number) {
    return prisma.settings.update({ where: { id: 1 }, data: { totalMesas } });
  }

  updateLugaresPorMesa(lugaresPorMesa: number) {
    return prisma.settings.update({ where: { id: 1 }, data: { lugaresPorMesa } });
  }

  updateDuracaoReservaMinutos(duracaoReservaMinutos: number) {
    return prisma.settings.update({ where: { id: 1 }, data: { duracaoReservaMinutos } });
  }

  updateTempoLimpezaMinutos(tempoLimpezaMinutos: number) {
    return prisma.settings.update({ where: { id: 1 }, data: { tempoLimpezaMinutos } });
  }

  updateHorario(horarioAbertura: string, horarioFechamento: string) {
    return prisma.settings.update({ where: { id: 1 }, data: { horarioAbertura, horarioFechamento } });
  }

  updatePin(apiPin: string) {
    return prisma.settings.update({ where: { id: 1 }, data: { apiPin } });
  }
}
