-- AlterTable
ALTER TABLE "reservas" ADD COLUMN     "nomeCliente" TEXT;

-- CreateTable
CREATE TABLE "mesas_bloqueadas" (
    "id" SERIAL NOT NULL,
    "numeroMesa" INTEGER NOT NULL,
    "bloqueadaPor" TEXT NOT NULL,
    "motivo" TEXT,
    "bloqueadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mesas_bloqueadas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mesas_bloqueadas_numeroMesa_key" ON "mesas_bloqueadas"("numeroMesa");
