-- CreateTable
CREATE TABLE "event_days" (
    "id" SERIAL NOT NULL,
    "data" TEXT NOT NULL,
    "motivo" TEXT,
    "nomeCliente" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_days_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_days_data_key" ON "event_days"("data");
