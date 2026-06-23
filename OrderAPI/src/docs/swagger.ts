import swaggerJsdoc from "swagger-jsdoc";

const successWrapper = (schema: object) => ({
  type: "object",
  properties: {
    success: { type: "boolean", example: true },
    data: schema
  }
});

const errorSchema = {
  type: "object",
  properties: {
    success: { type: "boolean", example: false },
    message: { type: "string" }
  }
};

const reservaResultSchema = {
  type: "object",
  properties: {
    ids: { type: "array", items: { type: "integer" }, example: [1] },
    mesas: { type: "array", items: { type: "integer" }, example: [5] },
    inicio: { type: "string", format: "date-time" },
    fim: { type: "string", format: "date-time" },
    fimLimpeza: { type: "string", format: "date-time" }
  }
};

const turnoSchema = {
  type: "object",
  properties: {
    turno: { type: "integer", example: 2 },
    turnoNome: { type: "string", example: "Jantar" },
    horaAbertura: { type: "string", example: "19:00" },
    horaFechamento: { type: "string", example: "23:00" }
  }
};

const nowSchema = {
  type: "object",
  properties: {
    hoje: { type: "string", example: "2026-06-20" },
    diaSemana: { type: "integer", example: 6, description: "0=Domingo ... 6=Sábado" },
    diaSemanaNome: { type: "string", example: "Sábado" },
    hora: { type: "string", example: "14:32" },
    turnos: { type: "array", items: turnoSchema, description: "Turnos ativos configurados para o dia de hoje" }
  }
};

const horarioDisponivelSchema = {
  type: "object",
  properties: {
    hora: { type: "string", example: "19:00" },
    duracaoMaximaMinutos: {
      type: "integer",
      example: 90,
      description: "Tempo máximo que a reserva pode durar nesse horário, já considerando o fechamento do turno"
    }
  }
};

const disponibilidadeSchema = {
  type: "object",
  properties: {
    dias: {
      type: "array",
      items: {
        type: "object",
        properties: {
          data: { type: "string", example: "2026-06-20" },
          diaSemanaNome: { type: "string", example: "Sábado" },
          horarios: { type: "array", items: horarioDisponivelSchema }
        }
      },
      description: "Apenas dias com ao menos um horário disponível são incluídos"
    }
  }
};

const mesaSchema = {
  type: "object",
  properties: {
    numero: { type: "integer", example: 5 },
    status: { type: "string", enum: ["available", "reserved", "occupied", "cleaning", "blocked"], example: "available" },
    reserva: {
      type: "object",
      nullable: true,
      properties: {
        id: { type: "integer" },
        grupoReservaId: { type: "string", nullable: true },
        mesasJuntadas: { type: "array", items: { type: "integer" } },
        quantidadePessoas: { type: "integer" },
        nomeCliente: { type: "string" },
        telefone: { type: "string" },
        inicioReserva: { type: "string", format: "date-time" },
        fimReserva: { type: "string", format: "date-time" },
        fimLimpeza: { type: "string", format: "date-time" }
      }
    },
    bloqueio: {
      type: "object",
      nullable: true,
      properties: {
        bloqueadaPor: { type: "string", example: "Gerente" },
        motivo: { type: "string", nullable: true, example: "Manutenção" },
        bloqueadaEm: { type: "string", example: "20/06/2026 14:30:00" }
      }
    }
  }
};

const horarioFuncionamentoSchema = {
  type: "object",
  properties: {
    id: { type: "integer" },
    diaSemana: { type: "integer", example: 6, description: "0=Domingo ... 6=Sábado" },
    diaNome: { type: "string", example: "Sábado" },
    turno: { type: "integer", example: 2 },
    turnoNome: { type: "string", example: "Jantar" },
    horaAbertura: { type: "string", example: "19:00" },
    horaFechamento: { type: "string", example: "23:00" },
    ativo: { type: "boolean", example: true }
  }
};

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "WA Restaurant — API de Reservas",
      version: "2.0.0",
      description: "API para controle de disponibilidade e reservas de mesas."
    },
    servers: [{ url: "/", description: "Servidor atual" }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        apiPin: { type: "apiKey", in: "header", name: "X-API-PIN" }
      },
      schemas: {
        Error: errorSchema,
        ReservaResult: reservaResultSchema,
        Now: nowSchema,
        Disponibilidade: disponibilidadeSchema,
        Mesa: mesaSchema,
        HorarioFuncionamento: horarioFuncionamentoSchema,
        EventDay: {
          type: "object",
          properties: {
            id: { type: "integer" },
            data: { type: "string", example: "2026-07-15" },
            dataFormatada: { type: "string", example: "15/07/2026" },
            dataExtenso: { type: "string", example: "Terça, 15 de julho de 2026" },
            diaSemana: { type: "integer", example: 2, description: "0=Domingo ... 6=Sábado" },
            diaSemanaNome: { type: "string", example: "Terça" },
            motivo: { type: "string", nullable: true, example: "Confraternização empresa X" },
            nomeCliente: { type: "string", example: "João Silva" },
            telefone: { type: "string", example: "11999999999" },
            passado: { type: "boolean", example: false, description: "true se o dia já passou" },
            criadoEm: { type: "string", example: "20/06/2026 14:30:00" }
          }
        },
        Reserva: {
          type: "object",
          properties: {
            id: { type: "integer" },
            numeroMesa: { type: "integer" },
            grupoReservaId: { type: "string", nullable: true },
            quantidadePessoas: { type: "integer" },
            nomeCliente: { type: "string" },
            telefone: { type: "string" },
            inicioReserva: { type: "string", format: "date-time" },
            fimReserva: { type: "string", format: "date-time" },
            fimLimpeza: { type: "string", format: "date-time" },
            createdAt: { type: "string", format: "date-time" }
          }
        }
      }
    },
    paths: {
      "/admin/login": {
        post: {
          tags: ["Auth"],
          summary: "Login do administrador",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string", example: "seu-email@exemplo.com" },
                    password: { type: "string", example: "sua-senha" }
                  }
                }
              }
            }
          },
          responses: {
            "200": {
              description: "Token JWT",
              content: { "application/json": { schema: successWrapper({ type: "object", properties: { accessToken: { type: "string" } } }) } }
            },
            "401": { description: "Credenciais inválidas", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } }
          }
        }
      },
      "/admin/dashboard": {
        get: {
          tags: ["Admin"],
          summary: "Resumo atual do salão",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "Contagem de mesas",
              content: { "application/json": { schema: successWrapper({ type: "object", properties: { totalMesas: { type: "integer", example: 70 }, mesasLivres: { type: "integer", example: 50 }, mesasReservadas: { type: "integer", example: 18 }, mesasBloqueadas: { type: "integer", example: 2 } } }) } }
            }
          }
        }
      },
      "/admin/reservations": {
        get: {
          tags: ["Admin"],
          summary: "Listar reservas futuras e ativas",
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "Lista", content: { "application/json": { schema: successWrapper({ type: "array", items: { $ref: "#/components/schemas/Reserva" } }) } } } }
        },
        post: {
          tags: ["Admin"],
          summary: "Criar reserva em mesa específica",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["mesa", "quantidadePessoas", "data", "hora", "nomeCliente", "telefone"],
                  properties: {
                    mesa: { type: "integer", example: 10 },
                    quantidadePessoas: { type: "integer", minimum: 1, example: 3 },
                    data: { type: "string", example: "2026-06-20" },
                    hora: { type: "string", example: "19:00" },
                    duracaoMinutos: { type: "integer", minimum: 30, example: 90, description: "Opcional. Se omitido, usa o padrão configurado." },
                    nomeCliente: { type: "string", example: "João Silva", description: "Nome do cliente." },
                    telefone: { type: "string", example: "11999999999", description: "Telefone do cliente com DDD." }
                  }
                }
              }
            }
          },
          responses: {
            "201": { description: "Criada", content: { "application/json": { schema: successWrapper({ $ref: "#/components/schemas/ReservaResult" }) } } },
            "400": { description: "Capacidade excedida ou horário inválido" },
            "409": { description: "Mesa indisponível" }
          }
        }
      },
      "/admin/reservations/{id}": {
        delete: {
          tags: ["Admin"],
          summary: "Cancelar reserva",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          responses: { "200": { description: "Cancelada" }, "404": { description: "Não encontrada" } }
        }
      },
      "/admin/tables": {
        get: {
          tags: ["Admin"],
          summary: "Listar todas as mesas com status atual",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": { description: "Lista de mesas", content: { "application/json": { schema: successWrapper({ type: "array", items: { $ref: "#/components/schemas/Mesa" } }) } } }
          }
        }
      },
      "/admin/tables/{numero}/block": {
        post: {
          tags: ["Admin"],
          summary: "Bloquear uma mesa",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "numero", in: "path", required: true, schema: { type: "integer" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["bloqueadaPor"],
                  properties: {
                    bloqueadaPor: { type: "string", example: "Gerente" },
                    motivo: { type: "string", example: "Manutenção" }
                  }
                }
              }
            }
          },
          responses: {
            "201": { description: "Mesa bloqueada" },
            "404": { description: "Mesa não existe" }
          }
        },
        delete: {
          tags: ["Admin"],
          summary: "Desbloquear uma mesa",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "numero", in: "path", required: true, schema: { type: "integer" } }],
          responses: {
            "200": { description: "Mesa desbloqueada" },
            "404": { description: "Bloqueio não encontrado" }
          }
        }
      },
      "/admin/operating-hours": {
        get: {
          tags: ["Admin"],
          summary: "Listar horários de funcionamento configurados",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": { description: "Lista de turnos configurados", content: { "application/json": { schema: successWrapper({ type: "array", items: { $ref: "#/components/schemas/HorarioFuncionamento" } }) } } }
          }
        }
      },
      "/admin/operating-hours/{dia}/{turno}": {
        put: {
          tags: ["Admin"],
          summary: "Criar ou atualizar um turno de funcionamento",
          description: "dia: 0=Domingo ... 6=Sábado. turno: 1=Almoço, 2=Jantar.",
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: "dia", in: "path", required: true, schema: { type: "integer", minimum: 0, maximum: 6 } },
            { name: "turno", in: "path", required: true, schema: { type: "integer", minimum: 1, maximum: 2 } }
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["horaAbertura", "horaFechamento"],
                  properties: {
                    horaAbertura: { type: "string", example: "19:00" },
                    horaFechamento: { type: "string", example: "23:00" },
                    ativo: { type: "boolean", default: true }
                  }
                }
              }
            }
          },
          responses: {
            "200": { description: "Turno salvo", content: { "application/json": { schema: successWrapper({ $ref: "#/components/schemas/HorarioFuncionamento" }) } } },
            "400": { description: "Horário inválido ou conflito entre turnos" }
          }
        },
        delete: {
          tags: ["Admin"],
          summary: "Remover um turno de funcionamento",
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: "dia", in: "path", required: true, schema: { type: "integer", minimum: 0, maximum: 6 } },
            { name: "turno", in: "path", required: true, schema: { type: "integer", minimum: 1, maximum: 2 } }
          ],
          responses: {
            "200": { description: "Turno removido" },
            "404": { description: "Turno não encontrado" }
          }
        }
      },
      "/admin/event-days": {
        get: {
          tags: ["Admin"],
          summary: "Listar dias reservados para evento",
          description: "Retorna todos os dias bloqueados (futuros e histórico). O campo `passado` indica se o evento já ocorreu.",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": { description: "Lista de eventos", content: { "application/json": { schema: successWrapper({ type: "array", items: { $ref: "#/components/schemas/EventDay" } }) } } }
          }
        },
        post: {
          tags: ["Admin"],
          summary: "Reservar um dia para evento",
          description: "Bloqueia o dia inteiro — nenhuma reserva normal poderá ser feita nessa data pela IA ou pelo admin.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["data", "nomeCliente", "telefone"],
                  properties: {
                    data: { type: "string", example: "2026-07-15", description: "Formato YYYY-MM-DD" },
                    nomeCliente: { type: "string", example: "João Silva" },
                    telefone: { type: "string", example: "11999999999" },
                    motivo: { type: "string", example: "Confraternização empresa X", description: "Opcional" }
                  }
                }
              }
            }
          },
          responses: {
            "201": { description: "Evento criado", content: { "application/json": { schema: successWrapper({ $ref: "#/components/schemas/EventDay" }) } } },
            "400": { description: "Data inválida" },
            "409": { description: "Dia já reservado para evento" }
          }
        }
      },
      "/admin/event-days/{data}": {
        delete: {
          tags: ["Admin"],
          summary: "Remover reserva de evento",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "data", in: "path", required: true, schema: { type: "string", example: "2026-07-15" }, description: "Formato YYYY-MM-DD" }],
          responses: {
            "200": { description: "Evento removido" },
            "404": { description: "Nenhum evento encontrado para a data" }
          }
        }
      },
      "/admin/config": {
        get: { tags: ["Config"], summary: "Obter configurações", security: [{ bearerAuth: [] }], responses: { "200": { description: "Settings" } } }
      },
      "/admin/config/tables": {
        put: { tags: ["Config"], summary: "Alterar total de mesas", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["totalMesas"], properties: { totalMesas: { type: "integer", example: 100 } } } } } }, responses: { "200": { description: "OK" }, "409": { description: "Conflito com reservas ativas" } } }
      },
      "/admin/config/capacity": {
        put: { tags: ["Config"], summary: "Alterar lugares por mesa", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["lugaresPorMesa"], properties: { lugaresPorMesa: { type: "integer", example: 4 } } } } } }, responses: { "200": { description: "OK" } } }
      },
      "/admin/config/duration": {
        put: { tags: ["Config"], summary: "Alterar duração da reserva", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["duracaoReservaMinutos"], properties: { duracaoReservaMinutos: { type: "integer", example: 120 } } } } } }, responses: { "200": { description: "OK" } } }
      },
      "/admin/config/cleanup": {
        put: { tags: ["Config"], summary: "Alterar tempo de limpeza", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["tempoLimpezaMinutos"], properties: { tempoLimpezaMinutos: { type: "integer", example: 30 } } } } } }, responses: { "200": { description: "OK" } } }
      },
      "/admin/config/hours": {
        put: { tags: ["Config"], summary: "Alterar horário de funcionamento", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["abertura", "fechamento"], properties: { abertura: { type: "string", example: "11:00" }, fechamento: { type: "string", example: "23:00" } } } } } }, responses: { "200": { description: "OK" } } }
      },
      "/admin/config/pin": {
        put: { tags: ["Config"], summary: "Alterar PIN da API externa", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["pin"], properties: { pin: { type: "string", example: "987654" } } } } } }, responses: { "200": { description: "PIN atualizado" } } }
      },
      "/api/now": {
        get: {
          tags: ["API Externa"],
          summary: "Data/hora atual do servidor e turnos do dia",
          description: "Referência de tempo para a IA calcular datas relativas (ex: 'amanhã', 'sábado que vem') a partir de uma âncora confiável, em vez de tentar adivinhar a data atual.",
          security: [{ apiPin: [] }],
          responses: {
            "200": { description: "Referência de tempo", content: { "application/json": { schema: successWrapper({ $ref: "#/components/schemas/Now" }) } } },
            "401": { description: "PIN inválido" }
          }
        }
      },
      "/api/status": {
        get: {
          tags: ["API Externa"],
          summary: "Disponibilidade para um horário específico",
          security: [{ apiPin: [] }],
          parameters: [
            { name: "data", in: "query", required: true, schema: { type: "string", example: "2026-06-20" } },
            { name: "hora", in: "query", required: true, schema: { type: "string", example: "19:00" } }
          ],
          responses: {
            "200": { description: "Status", content: { "application/json": { schema: successWrapper({ type: "object", properties: { totalMesas: { type: "integer" }, mesasDisponiveis: { type: "integer" }, mesasIndisponiveis: { type: "integer" } } }) } } },
            "401": { description: "PIN inválido" }
          }
        }
      },
      "/api/availability": {
        get: {
          tags: ["API Externa"],
          summary: "Horários disponíveis em um intervalo de dias",
          description: "Retorna, para cada dia do intervalo, os horários com mesa livre e o tempo máximo de permanência em cada um. Use para 'essa semana' (intervalo de vários dias) ou para uma data específica (dataInicio igual a dataFim).",
          security: [{ apiPin: [] }],
          parameters: [
            { name: "quantidadePessoas", in: "query", required: true, schema: { type: "integer", minimum: 1, example: 4 } },
            { name: "duracaoMinutos", in: "query", required: false, schema: { type: "integer", minimum: 30, example: 90 }, description: "Tempo que o cliente pretende ficar. Se omitido, usa o padrão configurado." },
            { name: "dataInicio", in: "query", required: false, schema: { type: "string", example: "2026-06-20" }, description: "Se omitido, usa a data de hoje (servidor)." },
            { name: "dataFim", in: "query", required: false, schema: { type: "string", example: "2026-06-26" }, description: "Se omitido, usa dataInicio + 6 dias. Intervalo máximo de 14 dias." }
          ],
          responses: {
            "200": { description: "Disponibilidade", content: { "application/json": { schema: successWrapper({ $ref: "#/components/schemas/Disponibilidade" }) } } },
            "400": { description: "Capacidade excedida, duração acima do máximo permitido ou intervalo de datas inválido" },
            "401": { description: "PIN inválido" }
          }
        }
      },
      "/api/reservations": {
        post: {
          tags: ["API Externa"],
          summary: "Reservar primeira mesa disponível",
          security: [{ apiPin: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["quantidadePessoas", "data", "hora", "nomeCliente", "telefone"],
                  properties: {
                    quantidadePessoas: { type: "integer", minimum: 1, example: 3 },
                    data: { type: "string", example: "2026-06-20" },
                    hora: { type: "string", example: "19:00" },
                    duracaoMinutos: { type: "integer", minimum: 30, example: 90, description: "Opcional. Se omitido, usa o padrão configurado." },
                    nomeCliente: { type: "string", example: "João Silva", description: "Nome do cliente." },
                    telefone: { type: "string", example: "11999999999", description: "Telefone do cliente com DDD." }
                  }
                }
              }
            }
          },
          responses: {
            "201": { description: "Reserva criada", content: { "application/json": { schema: successWrapper({ $ref: "#/components/schemas/ReservaResult" }) } } },
            "400": { description: "Capacidade excedida ou horário inválido" },
            "401": { description: "PIN inválido" },
            "409": { description: "Nenhuma mesa disponível" }
          }
        }
      }
    }
  },
  apis: []
};

export const swaggerSpec = swaggerJsdoc(options);
