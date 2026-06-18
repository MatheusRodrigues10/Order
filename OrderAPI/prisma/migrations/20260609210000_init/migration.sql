CREATE TABLE "settings" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "totalMesas" INTEGER NOT NULL DEFAULT 70,
  "duracaoReservaHoras" INTEGER NOT NULL DEFAULT 2,
  "apiPin" TEXT NOT NULL DEFAULT '123456',

  CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "admins" (
  "id" SERIAL NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reservas" (
  "id" SERIAL NOT NULL,
  "numeroMesa" INTEGER NOT NULL,
  "reservadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiraEm" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "reservas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");
CREATE UNIQUE INDEX "reservas_numeroMesa_key" ON "reservas"("numeroMesa");
CREATE INDEX "reservas_expiraEm_idx" ON "reservas"("expiraEm");
