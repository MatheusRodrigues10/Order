import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

export class ReservaRepository {
  count() {
    return prisma.reserva.count();
  }

  list() {
    return prisma.reserva.findMany({
      where: {
        liberaEm: {
          gt: new Date()
        }
      },
      orderBy: [{ inicioEm: "asc" }, { numeroMesa: "asc" }]
    });
  }

  findById(id: number) {
    return prisma.reserva.findUnique({ where: { id } });
  }

  findHighestReservedMesa() {
    return prisma.reserva.findFirst({
      orderBy: { numeroMesa: "desc" }
    });
  }

  findConflicts(inicioEm: Date, fimEm: Date) {
    return prisma.reserva.findMany({
      where: {
        inicioEm: {
          lt: fimEm
        },
        liberaEm: {
          gt: inicioEm
        }
      },
      orderBy: [{ numeroMesa: "asc" }, { inicioEm: "asc" }]
    });
  }

  findMesaConflicts(numeroMesa: number, inicioEm: Date, fimEm: Date) {
    return prisma.reserva.findMany({
      where: {
        numeroMesa,
        inicioEm: {
          lt: fimEm
        },
        liberaEm: {
          gt: inicioEm
        }
      }
    });
  }

  create(numeroMesa: number, inicioEm: Date, expiraEm: Date, liberaEm: Date, duracaoMinutos: number) {
    return prisma.reserva.create({
      data: {
        numeroMesa,
        inicioEm,
        expiraEm,
        liberaEm,
        duracaoMinutos
      }
    });
  }

  deleteById(id: number) {
    return prisma.reserva.delete({
      where: { id }
    });
  }

  deleteExpired(now = new Date()) {
    return prisma.reserva.deleteMany({
      where: {
        liberaEm: {
          lte: now
        }
      }
    });
  }

  async createIfFree(numeroMesa: number, inicioEm: Date, expiraEm: Date, liberaEm: Date, duracaoMinutos: number) {
    const conflicts = await this.findMesaConflicts(numeroMesa, inicioEm, expiraEm);
    if (conflicts.length > 0) {
      return null;
    }

    try {
      return await this.create(numeroMesa, inicioEm, expiraEm, liberaEm, duracaoMinutos);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return null;
      }
      throw error;
    }
  }
}
