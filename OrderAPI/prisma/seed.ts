import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const totalMesas = Number(process.env.DEFAULT_TOTAL_MESAS ?? 70);
  const duracaoReservaMinutos = Number(process.env.DEFAULT_DURACAO_RESERVA_MINUTOS ?? 120);
  const duracaoLimpezaMinutos = Number(process.env.DEFAULT_DURACAO_LIMPEZA_MINUTOS ?? 15);
  const apiPin = process.env.DEFAULT_API_PIN ?? "123456";
  const email = process.env.ADMIN_EMAIL ?? "admin@restaurant.local";
  const password = process.env.ADMIN_PASSWORD ?? "Admin@123456";

  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      totalMesas,
      duracaoReservaMinutos,
      duracaoLimpezaMinutos,
      apiPin
    }
  });

  const existingAdmin = await prisma.admin.findUnique({ where: { email } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.admin.create({
      data: {
        email,
        passwordHash
      }
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
