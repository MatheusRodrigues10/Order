import { prisma } from "../config/prisma";

export class AdminRepository {
  findByEmail(email: string) {
    return prisma.admin.findUnique({ where: { email } });
  }
}
