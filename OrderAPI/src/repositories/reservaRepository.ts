import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

export class ReservaRepository {
  count() {
    return prisma.reserva.count();
  }

  list() {
    return prisma.reserva.findMany({
      orderBy: { numeroMesa: "asc" }
    });
  }

  findByMesa(numeroMesa: number) {
    return prisma.reserva.findUnique({ where: { numeroMesa } });
  }

  findHighestReservedMesa() {
    return prisma.reserva.findFirst({
      orderBy: { numeroMesa: "desc" }
    });
  }

  create(numeroMesa: number, expiraEm: Date, liberaEm: Date) {
    return prisma.reserva.create({
      data: {
        numeroMesa,
        expiraEm,
        liberaEm
      }
    });
  }

  deleteByMesa(numeroMesa: number) {
    return prisma.reserva.delete({
      where: { numeroMesa }
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

  async createIfFree(numeroMesa: number, expiraEm: Date, liberaEm: Date) {
    try {
      return await this.create(numeroMesa, expiraEm, liberaEm);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return null;
      }
      throw error;
    }
  }
}
