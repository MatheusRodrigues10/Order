/**
 * rotate-production-secrets.ts
 *
 * Atualiza os hashes bcrypt de ADMIN_PASSWORD e DEFAULT_API_PIN no banco.
 * Lê valores exclusivamente de variáveis de ambiente. Não imprime segredos.
 *
 * Uso:
 *   npx tsx scripts/rotate-production-secrets.ts
 *
 * Requer no ambiente:
 *   DATABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD, DEFAULT_API_PIN
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const apiPin = process.env.DEFAULT_API_PIN;

  if (!email || !password || !apiPin) {
    console.error("ERRO: ADMIN_EMAIL, ADMIN_PASSWORD e DEFAULT_API_PIN devem estar definidos no ambiente.");
    process.exit(1);
  }

  console.log("=== Rotação de segredos de produção ===");
  console.log("  Valores NÃO serão impressos.\n");

  // ── Rotacionar senha do admin ──────────────────────────────────────────────
  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin) {
    console.error(`ERRO: Admin com e-mail configurado não encontrado no banco.`);
    process.exit(1);
  }

  const newPasswordHash = await bcrypt.hash(password, 12);
  await prisma.admin.update({
    where: { email },
    data: { passwordHash: newPasswordHash },
  });
  console.log("  Admin password rotated: OK");

  // ── Rotacionar API PIN ─────────────────────────────────────────────────────
  await prisma.settings.update({
    where: { id: 1 },
    data: { apiPin },
  });
  console.log("  API PIN rotated: OK");

  console.log("\n  Values were not printed.");
  console.log("=== Rotação concluída ===");
}

main()
  .catch((e) => {
    console.error("ERRO durante rotação:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
