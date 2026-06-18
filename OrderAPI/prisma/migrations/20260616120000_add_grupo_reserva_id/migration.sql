-- Add grupoReservaId to link tables joined in a single reservation
ALTER TABLE "reservas" ADD COLUMN IF NOT EXISTS "grupoReservaId" TEXT;
CREATE INDEX IF NOT EXISTS "reservas_grupoReservaId_idx" ON "reservas"("grupoReservaId");
