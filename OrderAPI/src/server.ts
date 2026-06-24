import { env } from "./config/env";
import { prisma } from "./config/prisma";
import { app } from "./app";

const server = app.listen(env.PORT, () => {
  console.log(`API rodando em http://localhost:${env.PORT}`);
  console.log(`Swagger em http://localhost:${env.PORT}/docs`);
});

async function shutdown() {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
