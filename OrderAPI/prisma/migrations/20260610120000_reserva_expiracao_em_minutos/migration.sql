ALTER TABLE "settings"
  RENAME COLUMN "duracaoReservaHoras" TO "duracaoReservaMinutos";

ALTER TABLE "settings"
  ALTER COLUMN "duracaoReservaMinutos" SET DEFAULT 120;

UPDATE "settings"
SET "duracaoReservaMinutos" = "duracaoReservaMinutos" * 60;
