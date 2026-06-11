ALTER TABLE "reservas"
  ADD COLUMN "inicioEm" TIMESTAMP(3),
  ADD COLUMN "duracaoMinutos" INTEGER;

UPDATE "reservas"
SET
  "inicioEm" = "reservadoEm",
  "duracaoMinutos" = GREATEST(1, CEIL(EXTRACT(EPOCH FROM ("expiraEm" - "reservadoEm")) / 60)::INTEGER)
WHERE "inicioEm" IS NULL OR "duracaoMinutos" IS NULL;

ALTER TABLE "reservas"
  ALTER COLUMN "inicioEm" SET NOT NULL,
  ALTER COLUMN "duracaoMinutos" SET NOT NULL;

DROP INDEX IF EXISTS "reservas_numeroMesa_key";
CREATE INDEX "reservas_numeroMesa_inicioEm_expiraEm_idx" ON "reservas"("numeroMesa", "inicioEm", "expiraEm");
