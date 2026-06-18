-- Add turno column (1 = almoço, 2 = jantar) with default 1 for existing rows
ALTER TABLE "horarios_funcionamento" ADD COLUMN "turno" INTEGER NOT NULL DEFAULT 1;

-- Drop the old unique index on diaSemana only
DROP INDEX "horarios_funcionamento_diaSemana_key";

-- Create new unique index on (diaSemana, turno)
CREATE UNIQUE INDEX "horarios_funcionamento_diaSemana_turno_key" ON "horarios_funcionamento"("diaSemana", "turno");
