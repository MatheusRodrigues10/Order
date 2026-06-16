-- Re-add nomeCliente and telefone to reservas (were dropped in the refactor migration)
ALTER TABLE "reservas" ADD COLUMN IF NOT EXISTS "nomeCliente" TEXT;
ALTER TABLE "reservas" ADD COLUMN IF NOT EXISTS "telefone" TEXT;
