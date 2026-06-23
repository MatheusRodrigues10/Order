UPDATE "reservas"
SET "nomeCliente" = 'Cliente teste sem nome'
WHERE "nomeCliente" IS NULL OR btrim("nomeCliente") = '';

UPDATE "reservas"
SET "telefone" = '0000000000'
WHERE "telefone" IS NULL OR btrim("telefone") = '';

ALTER TABLE "reservas"
  ALTER COLUMN "nomeCliente" SET NOT NULL,
  ALTER COLUMN "telefone" SET NOT NULL;

ALTER TABLE "reservas"
  ADD CONSTRAINT "reservas_nomeCliente_not_empty" CHECK (btrim("nomeCliente") <> ''),
  ADD CONSTRAINT "reservas_telefone_not_empty" CHECK (btrim("telefone") <> '');
