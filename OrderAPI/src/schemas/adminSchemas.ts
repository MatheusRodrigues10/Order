import { z } from "zod";

const horaRegex = /^\d{2}:\d{2}$/;
const dataRegex = /^\d{4}-\d{2}-\d{2}$/;

const nomeClienteObrigatorio = z.string()
  .trim()
  .min(1, "Nome do cliente é obrigatório")
  .max(120, "Nome do cliente deve ter no máximo 120 caracteres");

const telefoneObrigatorio = z.string()
  .trim()
  .min(1, "Telefone é obrigatório")
  .max(30, "Telefone deve ter no máximo 30 caracteres")
  .refine((val) => {
    const digits = val.replace(/\D/g, "");
    return digits.length >= 10 && digits.length <= 11;
  }, "Telefone incompleto. Informe o DDD e o número completo.");

const horaString = z.string().regex(horaRegex, "Formato HH:MM").refine(
  (val: string) => {
    const [h, m] = val.split(":").map(Number);
    return h >= 0 && h <= 23 && m >= 0 && m <= 59;
  },
  { message: "Hora inválida (HH: 00-23, MM: 00-59)" }
);

export const criarReservaAdminSchema = z.object({
  body: z.object({
    mesa: z.coerce.number().int().positive(),
    quantidadePessoas: z.coerce.number().int().min(1),
    data: z.string().regex(dataRegex, "Formato YYYY-MM-DD"),
    hora: horaString,
    duracaoMinutos: z.coerce.number().int().min(30).optional(),
    nomeCliente: nomeClienteObrigatorio,
    telefone: telefoneObrigatorio
  })
});

export const reservarExternalSchema = z.object({
  body: z.object({
    quantidadePessoas: z.coerce.number().int().min(1),
    data: z.string().regex(dataRegex, "Formato YYYY-MM-DD"),
    hora: horaString,
    duracaoMinutos: z.coerce.number().int().min(30).optional(),
    nomeCliente: nomeClienteObrigatorio,
    telefone: telefoneObrigatorio
  })
});

export const disponibilidadeQuerySchema = z.object({
  query: z.object({
    quantidadePessoas: z.coerce.number().int().min(1),
    duracaoMinutos: z.coerce.number().int().min(30).optional(),
    dataInicio: z.string().regex(dataRegex, "Formato YYYY-MM-DD").optional(),
    dataFim: z.string().regex(dataRegex, "Formato YYYY-MM-DD").optional()
  })
});

export const reservaParamSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive()
  })
});

export const totalMesasSchema = z.object({
  body: z.object({
    totalMesas: z.coerce.number().int().positive()
  })
});

export const capacidadeSchema = z.object({
  body: z.object({
    lugaresPorMesa: z.coerce.number().int().positive()
  })
});

export const expiracaoSchema = z.object({
  body: z.object({
    duracaoReservaMinutos: z.coerce.number().int().positive()
  })
});

export const limpezaSchema = z.object({
  body: z.object({
    tempoLimpezaMinutos: z.coerce.number().int().positive()
  })
});

export const horarioSchema = z.object({
  body: z.object({
    abertura: horaString,
    fechamento: horaString
  })
});

export const pinSchema = z.object({
  body: z.object({
    pin: z.string().min(4).max(20)
  })
});

export const statusQuerySchema = z.object({
  query: z.object({
    data: z.string().regex(dataRegex, "Formato YYYY-MM-DD"),
    hora: horaString
  })
});

export const mesaNumeroParamSchema = z.object({
  params: z.object({
    numero: z.coerce.number().int().positive()
  })
});

export const bloquearMesaSchema = z.object({
  params: z.object({
    numero: z.coerce.number().int().positive()
  }),
  body: z.object({
    bloqueadaPor: z.string().min(1),
    motivo: z.string().optional()
  })
});

export const horarioFuncionamentoDiaTurnoParamSchema = z.object({
  params: z.object({
    dia: z.coerce.number().int().min(0).max(6),
    turno: z.coerce.number().int().min(1).max(2)
  })
});

export const salvarHorarioFuncionamentoSchema = z.object({
  params: z.object({
    dia: z.coerce.number().int().min(0).max(6),
    turno: z.coerce.number().int().min(1).max(2)
  }),
  body: z.object({
    horaAbertura: horaString,
    horaFechamento: horaString,
    ativo: z.boolean().default(true)
  })
});

export const criarEventDaySchema = z.object({
  body: z.object({
    data: z.string().regex(dataRegex, "Formato YYYY-MM-DD"),
    nomeCliente: z.string().min(1).max(120),
    telefone: z.string().min(1).max(30),
    motivo: z.string().min(1).max(200).optional()
  })
});

export const eventDayParamSchema = z.object({
  params: z.object({
    data: z.string().regex(dataRegex, "Formato YYYY-MM-DD")
  })
});
