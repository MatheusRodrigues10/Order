import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Seed WA Restaurant ===");

  const email    = process.env.ADMIN_EMAIL    ?? "admin@restaurant.local";
  const password = process.env.ADMIN_PASSWORD ?? "Admin@123456";

  // ── Settings ────────────────────────────────────────────────────────────────
  await prisma.settings.upsert({
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
      apiPin: "123456"
    }
  });
  console.log("Settings: 70 mesas, 4 lugares/mesa, 120min reserva, 30min limpeza, 11:00-23:00");

  // ── Admin ────────────────────────────────────────────────────────────────────
  const existing = await prisma.admin.findUnique({ where: { email } });
  if (!existing) {
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.admin.create({ data: { email, passwordHash } });
    console.log(`Admin criado: ${email}`);
  } else {
    console.log(`Admin já existe: ${email}`);
  }

  // ── Reservas de teste ────────────────────────────────────────────────────────
  await prisma.reserva.deleteMany();

  const now  = new Date();
  const add  = (d: Date, min: number) => new Date(d.getTime() + min * 60_000);

  const hoje = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const at   = (h: number, m: number) => new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), h, m, 0, 0);

  const reservas = [
    { numeroMesa: 1,  quantidadePessoas: 2, inicioReserva: add(now, -30),   fimReserva: add(now, 90),   fimLimpeza: add(now, 120)  },
    { numeroMesa: 2,  quantidadePessoas: 4, inicioReserva: at(19, 0),       fimReserva: at(21, 0),      fimLimpeza: at(21, 30)     },
    { numeroMesa: 3,  quantidadePessoas: 3, inicioReserva: at(20, 30),      fimReserva: at(22, 30),     fimLimpeza: at(23, 0)      },
  ];

  let criadas = 0;
  for (const r of reservas) {
    try {
      await prisma.reserva.create({ data: r });
      criadas++;
    } catch {
      // skip conflicts
    }
  }

  console.log(`Reservas de teste criadas: ${criadas}`);
  console.log("=== Seed concluído ===");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
