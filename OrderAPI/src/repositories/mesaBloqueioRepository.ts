import { prisma } from "../config/prisma";

export class MesaBloqueioRepository {
  findAll() {
    return prisma.mesaBloqueada.findMany({
      orderBy: { numeroMesa: "asc" }
    });
  }

  findByNumero(numeroMesa: number) {
    return prisma.mesaBloqueada.findUnique({ where: { numeroMesa } });
  }

  block(numeroMesa: number, bloqueadaPor: string, motivo?: string) {
    return prisma.mesaBloqueada.create({
      data: { numeroMesa, bloqueadaPor, motivo: motivo ?? null }
    });
  }

  unblock(numeroMesa: number) {
    return prisma.mesaBloqueada.delete({ where: { numeroMesa } });
  }

  async getBloqueadasSet(): Promise<Set<number>> {
    const rows = await prisma.mesaBloqueada.findMany({ select: { numeroMesa: true } });
    return new Set(rows.map((r) => r.numeroMesa));
  }
}
