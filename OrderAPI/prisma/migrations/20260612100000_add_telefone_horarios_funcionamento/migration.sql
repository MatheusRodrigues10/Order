-- Add telefone column to reservas
ALTER TABLE "reservas" ADD COLUMN "telefone" TEXT;

-- Create horarios_funcionamento table
CREATE TABLE "horarios_funcionamento" (
    "id"             SERIAL NOT NULL,
    "diaSemana"      INTEGER NOT NULL,
    "horaAbertura"   TEXT NOT NULL,
    "horaFechamento" TEXT NOT NULL,
    "ativo"          BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "horarios_funcionamento_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "horarios_funcionamento_diaSemana_key" ON "horarios_funcionamento"("diaSemana");
