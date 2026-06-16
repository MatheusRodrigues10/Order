import { prisma } from "../config/prisma";

export class HorarioFuncionamentoRepository {
  findAll() {
    return prisma.horarioFuncionamento.findMany({
      orderBy: [{ diaSemana: "asc" }, { turno: "asc" }]
    });
  }

  findByDia(diaSemana: number) {
    return prisma.horarioFuncionamento.findMany({
      where: { diaSemana },
      orderBy: { turno: "asc" }
    });
  }

  findByDiaTurno(diaSemana: number, turno: number) {
    return prisma.horarioFuncionamento.findUnique({
      where: { diaSemana_turno: { diaSemana, turno } }
    });
  }

  upsert(diaSemana: number, turno: number, horaAbertura: string, horaFechamento: string, ativo: boolean) {
    return prisma.horarioFuncionamento.upsert({
      where: { diaSemana_turno: { diaSemana, turno } },
      update: { horaAbertura, horaFechamento, ativo },
      create: { diaSemana, turno, horaAbertura, horaFechamento, ativo }
    });
  }

  delete(diaSemana: number, turno: number) {
    return prisma.horarioFuncionamento.delete({
      where: { diaSemana_turno: { diaSemana, turno } }
    });
  }
}
