import { env } from "./config/env";
import { prisma } from "./config/prisma";
import { app } from "./app";
import { ReservaService } from "./services/reservaService";

const reservaService = new ReservaService();

const server = app.listen(env.PORT, () => {
  console.log(`API rodando em http://localhost:${env.PORT}`);
  console.log(`Swagger em http://localhost:${env.PORT}/docs`);
});

const cleanupInterval = setInterval(() => {
  reservaService.cleanupExpired().catch((error) => {
    console.error("Erro ao limpar reservas expiradas", error);
  });
}, 60 * 1000);

async function shutdown() {
  clearInterval(cleanupInterval);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
