import { prisma } from "../config/prisma";

export class SettingsRepository {
  find() {
    return prisma.settings.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        totalMesas: 70,
        duracaoReservaMinutos: 120,
        duracaoLimpezaMinutos: 15,
        apiPin: process.env.DEFAULT_API_PIN ?? "123456"
      }
    });
  }

  updateTotalMesas(totalMesas: number) {
    return prisma.settings.update({
      where: { id: 1 },
      data: { totalMesas }
    });
  }

  updateDuracaoReservaMinutos(duracaoReservaMinutos: number) {
    return prisma.settings.update({
      where: { id: 1 },
      data: { duracaoReservaMinutos }
    });
  }

  updateDuracaoLimpezaMinutos(duracaoLimpezaMinutos: number) {
    return prisma.settings.update({
      where: { id: 1 },
      data: { duracaoLimpezaMinutos }
    });
  }
}
