import { z } from "zod";

export const criarReservaSchema = z.object({
  body: z.object({
    mesa: z.coerce.number().int().positive()
  })
});

export const mesaParamSchema = z.object({
  params: z.object({
    mesa: z.coerce.number().int().positive()
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
