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
    mesa: { type: "integer", example: 5 },
    inicio: { type: "string", format: "date-time" },
    fim: { type: "string", format: "date-time" },
    fimLimpeza: { type: "string", format: "date-time" }
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
        Reserva: {
          type: "object",
          properties: {
            id: { type: "integer" },
            numeroMesa: { type: "integer" },
            quantidadePessoas: { type: "integer" },
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
                    email: { type: "string", example: "admin@restaurant.local" },
                    password: { type: "string", example: "Admin@123456" }
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
              content: { "application/json": { schema: successWrapper({ type: "object", properties: { totalMesas: { type: "integer", example: 70 }, mesasLivres: { type: "integer", example: 52 }, mesasReservadas: { type: "integer", example: 18 } } }) } }
            }
          }
        }
      },
      "/admin/reservas": {
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
                  required: ["mesa", "quantidadePessoas", "data", "hora"],
                  properties: {
                    mesa: { type: "integer", example: 10 },
                    quantidadePessoas: { type: "integer", minimum: 1, example: 3 },
                    data: { type: "string", example: "2026-06-20" },
                    hora: { type: "string", example: "19:00" }
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
      "/admin/reservas/{id}": {
        delete: {
          tags: ["Admin"],
          summary: "Cancelar reserva",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          responses: { "200": { description: "Cancelada" }, "404": { description: "Não encontrada" } }
        }
      },
      "/admin/config": {
        get: { tags: ["Config"], summary: "Obter configurações", security: [{ bearerAuth: [] }], responses: { "200": { description: "Settings" } } }
      },
      "/admin/config/mesas": {
        put: { tags: ["Config"], summary: "Alterar total de mesas", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["totalMesas"], properties: { totalMesas: { type: "integer", example: 100 } } } } } }, responses: { "200": { description: "OK" }, "409": { description: "Conflito com reservas ativas" } } }
      },
      "/admin/config/capacidade": {
        put: { tags: ["Config"], summary: "Alterar lugares por mesa", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["lugaresPorMesa"], properties: { lugaresPorMesa: { type: "integer", example: 4 } } } } } }, responses: { "200": { description: "OK" } } }
      },
      "/admin/config/expiracao": {
        put: { tags: ["Config"], summary: "Alterar duração da reserva", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["duracaoReservaMinutos"], properties: { duracaoReservaMinutos: { type: "integer", example: 120 } } } } } }, responses: { "200": { description: "OK" } } }
      },
      "/admin/config/limpeza": {
        put: { tags: ["Config"], summary: "Alterar tempo de limpeza", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["tempoLimpezaMinutos"], properties: { tempoLimpezaMinutos: { type: "integer", example: 30 } } } } } }, responses: { "200": { description: "OK" } } }
      },
      "/admin/config/horario": {
        put: { tags: ["Config"], summary: "Alterar horário de funcionamento", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["abertura", "fechamento"], properties: { abertura: { type: "string", example: "11:00" }, fechamento: { type: "string", example: "23:00" } } } } } }, responses: { "200": { description: "OK" } } }
      },
      "/admin/config/pin": {
        put: { tags: ["Config"], summary: "Alterar PIN da API externa", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["pin"], properties: { pin: { type: "string", example: "987654" } } } } } }, responses: { "200": { description: "PIN atualizado" } } }
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
      "/api/reservar": {
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
                  required: ["quantidadePessoas", "data", "hora"],
                  properties: {
                    quantidadePessoas: { type: "integer", minimum: 1, example: 3 },
                    data: { type: "string", example: "2026-06-20" },
                    hora: { type: "string", example: "19:00" }
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
