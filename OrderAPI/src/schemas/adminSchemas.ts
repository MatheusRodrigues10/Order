import { z } from "zod";

export const criarReservaSchema = z.object({
  body: z.object({
    mesa: z.coerce.number().int().positive(),
    dataReserva: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    horarioInicio: z.string().regex(/^\d{2}:\d{2}$/),
    duracaoMinutos: z.coerce.number().int().positive()
  })
});

export const reservaParamSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive()
  })
});

export const disponibilidadeSchema = z.object({
  query: z.object({
    dataReserva: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    horarioInicio: z.string().regex(/^\d{2}:\d{2}$/),
    duracaoMinutos: z.coerce.number().int().positive()
  })
});

export const totalMesasSchema = z.object({
  body: z.object({
    totalMesas: z.coerce.number().int().positive()
  })
});

export const expiracaoSchema = z.object({
  body: z.object({
    duracaoMinutos: z.coerce.number().int().positive()
  })
});
