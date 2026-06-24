import { prisma } from "../config/prisma";

type ReservaData = {
  numeroMesa: number;
  grupoReservaId?: string;
  quantidadePessoas: number;
  nomeCliente: string;
  telefone: string;
  inicioReserva: Date;
  fimReserva: Date;
  fimLimpeza: Date;
};

export class ReservaRepository {
  list() {
    return prisma.reserva.findMany({
      where: { fimLimpeza: { gt: new Date() } },
      orderBy: [{ inicioReserva: "asc" }, { numeroMesa: "asc" }]
    });
  }

  findById(id: number) {
    return prisma.reserva.findUnique({ where: { id } });
  }

  findConflicts(inicioReserva: Date, fimLimpeza: Date) {
    return prisma.reserva.findMany({
      where: {
        inicioReserva: { lt: fimLimpeza },
        fimLimpeza: { gt: inicioReserva }
      },
      orderBy: [{ numeroMesa: "asc" }, { inicioReserva: "asc" }]
    });
  }

  findHighestReservedMesa() {
    return prisma.reserva.findFirst({
      where: { fimLimpeza: { gt: new Date() } },
      orderBy: { numeroMesa: "desc" }
    });
  }

  countActiveMesas(now: Date) {
    return prisma.reserva.groupBy({
      by: ["numeroMesa"],
      where: {
        inicioReserva: { lte: now },
        fimLimpeza: { gt: now }
      }
    });
  }

  create(data: ReservaData) {
    return prisma.reserva.create({ data });
  }

  deleteById(id: number) {
    return prisma.reserva.delete({ where: { id } });
  }

  deleteByGrupoId(grupoReservaId: string) {
    return prisma.reserva.deleteMany({ where: { grupoReservaId } });
  }

  deleteExpired(now = new Date()) {
    return prisma.reserva.deleteMany({ where: { fimLimpeza: { lte: now } } });
  }

  async createIfFree(data: ReservaData) {
    try {
      return await prisma.$transaction(async (tx) => {
        const conflicts = await tx.reserva.findMany({
          where: {
            numeroMesa: data.numeroMesa,
            inicioReserva: { lt: data.fimLimpeza },
            fimLimpeza: { gt: data.inicioReserva }
          }
        });
        if (conflicts.length > 0) return null;
        return await tx.reserva.create({ data });
      }, { isolationLevel: "Serializable" });
    } catch {
      return null;
    }
  }
}
