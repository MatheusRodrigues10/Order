ALTER TABLE "settings"
  ADD COLUMN "duracaoLimpezaMinutos" INTEGER NOT NULL DEFAULT 15;

ALTER TABLE "reservas"
  ADD COLUMN "liberaEm" TIMESTAMP(3);

UPDATE "reservas"
SET "liberaEm" = "expiraEm" + INTERVAL '15 minutes'
WHERE "liberaEm" IS NULL;

ALTER TABLE "reservas"
  ALTER COLUMN "liberaEm" SET NOT NULL;

DROP INDEX IF EXISTS "reservas_expiraEm_idx";
CREATE INDEX "reservas_liberaEm_idx" ON "reservas"("liberaEm");
