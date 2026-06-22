import { prisma } from "../config/prisma";

export class EventDayRepository {
  findAll() {
    return prisma.eventDay.findMany({
      orderBy: { data: "asc" }
    });
  }

  findByData(data: string) {
    return prisma.eventDay.findUnique({ where: { data } });
  }

  create(data: string, nomeCliente: string, telefone: string, motivo?: string) {
    return prisma.eventDay.create({
      data: { data, nomeCliente, telefone, motivo: motivo ?? null }
    });
  }

  delete(data: string) {
    return prisma.eventDay.delete({ where: { data } });
  }

  async isEventDay(data: string): Promise<boolean> {
    const found = await prisma.eventDay.findUnique({
      where: { data },
      select: { id: true }
    });
    return found !== null;
  }
}
