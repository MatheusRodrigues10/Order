-- Settings: rename duracaoLimpezaMinutos → tempoLimpezaMinutos
ALTER TABLE "settings" RENAME COLUMN "duracaoLimpezaMinutos" TO "tempoLimpezaMinutos";

-- Settings: add new columns
ALTER TABLE "settings" ADD COLUMN "lugaresPorMesa" INTEGER NOT NULL DEFAULT 4;
ALTER TABLE "settings" ADD COLUMN "horarioAbertura" TEXT NOT NULL DEFAULT '11:00';
ALTER TABLE "settings" ADD COLUMN "horarioFechamento" TEXT NOT NULL DEFAULT '23:00';

-- Update existing settings row
UPDATE "settings" SET "tempoLimpezaMinutos" = 30 WHERE id = 1;

-- Reservas: add quantidadePessoas
ALTER TABLE "reservas" ADD COLUMN "quantidadePessoas" INTEGER NOT NULL DEFAULT 1;

-- Reservas: rename columns
ALTER TABLE "reservas" RENAME COLUMN "inicioEm" TO "inicioReserva";
ALTER TABLE "reservas" RENAME COLUMN "expiraEm" TO "fimReserva";
ALTER TABLE "reservas" RENAME COLUMN "liberaEm" TO "fimLimpeza";
ALTER TABLE "reservas" RENAME COLUMN "reservadoEm" TO "createdAt";

-- Reservas: drop old columns
ALTER TABLE "reservas" DROP COLUMN IF EXISTS "nomeCliente";
ALTER TABLE "reservas" DROP COLUMN IF EXISTS "telefone";
ALTER TABLE "reservas" DROP COLUMN IF EXISTS "duracaoMinutos";

-- Reservas: drop old indexes
DROP INDEX IF EXISTS "reservas_numeroMesa_inicioEm_expiraEm_idx";
DROP INDEX IF EXISTS "reservas_liberaEm_idx";

-- Reservas: create new indexes
CREATE INDEX IF NOT EXISTS "reservas_numeroMesa_idx" ON "reservas"("numeroMesa");
CREATE INDEX IF NOT EXISTS "reservas_inicioReserva_idx" ON "reservas"("inicioReserva");
CREATE INDEX IF NOT EXISTS "reservas_fimLimpeza_idx" ON "reservas"("fimLimpeza");
