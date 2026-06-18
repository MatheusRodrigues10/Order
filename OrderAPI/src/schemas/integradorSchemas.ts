import { z } from "zod";

const horaRegex = /^\d{2}:\d{2}$/;
const dataRegex = /^\d{4}-\d{2}-\d{2}$/;

export const fluxoParamSchema = z.object({
  params: z.object({
    fluxo: z.enum(["reserva-a", "reserva-b"])
  })
});

export const sessionParamSchema = z.object({
  params: z.object({
    fluxo: z.enum(["reserva-a", "reserva-b"]),
    sessionId: z.string().uuid()
  })
});

export const informarPessoasSchema = z.object({
  params: z.object({
    fluxo: z.enum(["reserva-a", "reserva-b"]),
    sessionId: z.string().uuid()
  }),
  body: z.object({
    quantidadePessoas: z.coerce.number().int().min(1)
  })
});

export const informarDataEspecificaSchema = z.object({
  params: z.object({
    fluxo: z.enum(["reserva-b"]),
    sessionId: z.string().uuid()
  }),
  body: z.object({
    data: z.string().regex(dataRegex, "Formato YYYY-MM-DD")
  })
});

export const selecionarHorarioSchema = z.object({
  params: z.object({
    fluxo: z.enum(["reserva-a", "reserva-b"]),
    sessionId: z.string().uuid()
  }),
  body: z.object({
    data: z.string().regex(dataRegex, "Formato YYYY-MM-DD"),
    hora: z.string().regex(horaRegex, "Formato HH:MM")
  })
});

export const informarDadosClienteSchema = z.object({
  params: z.object({
    fluxo: z.enum(["reserva-a", "reserva-b"]),
    sessionId: z.string().uuid()
  }),
  body: z.object({
    nomeCliente: z.string().min(1).max(120),
    telefone: z.string().min(1).max(30).optional()
  })
});

export const confirmarReservaSchema = z.object({
  params: z.object({
    fluxo: z.enum(["reserva-a", "reserva-b"]),
    sessionId: z.string().uuid()
  }),
  body: z.object({
    confirmar: z.boolean()
  })
});

export function mapFluxoParam(fluxo: "reserva-a" | "reserva-b") {
  return fluxo === "reserva-a" ? "reserva_a" : "reserva_b";
}
