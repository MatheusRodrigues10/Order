import swaggerJsdoc from "swagger-jsdoc";

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Reservas de Mesas API",
      version: "1.0.0",
      description: "API para gerenciamento de reservas ativas de mesas de restaurante."
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Local"
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        },
        apiPinAuth: {
          type: "apiKey",
          in: "header",
          name: "X-API-PIN"
        }
      },
      schemas: {
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", example: "admin@restaurant.local" },
            password: { type: "string", example: "Admin@123456" }
          }
        },
        LoginResponse: {
          type: "object",
          properties: {
            accessToken: { type: "string" }
          }
        },
        StatusResponse: {
          type: "object",
          properties: {
            totalMesas: { type: "integer", example: 70 },
            mesasReservadas: { type: "integer", example: 18 },
            mesasLivres: { type: "integer", example: 52 }
          }
        },
        ReservaResponse: {
          type: "object",
          properties: {
            id: { type: "integer", example: 42 },
            mesa: { type: "integer", example: 5 },
            inicioEm: { type: "string", example: "11/06/2026 19:30:00" },
            expiraEm: { type: "string", example: "10/06/2026 21:30:00" },
            liberaEm: { type: "string", example: "10/06/2026 21:45:00" },
            duracaoMinutos: { type: "integer", example: 120 }
          }
        },
        ReservaAtiva: {
          type: "object",
          properties: {
            id: { type: "integer", example: 42 },
            mesa: { type: "integer", example: 10 },
            reservadoEm: { type: "string", example: "10/06/2026 19:30:00" },
            inicioEm: { type: "string", example: "11/06/2026 19:30:00" },
            expiraEm: { type: "string", example: "10/06/2026 21:30:00" },
            liberaEm: { type: "string", example: "10/06/2026 21:45:00" },
            duracaoMinutos: { type: "integer", example: 120 },
            emLimpeza: { type: "boolean", example: false }
          }
        },
        DisponibilidadeResponse: {
          type: "object",
          properties: {
            totalMesas: { type: "integer", example: 70 },
            dataReserva: { type: "string", example: "2026-06-11" },
            horarioInicio: { type: "string", example: "19:30" },
            duracaoMinutos: { type: "integer", example: 120 },
            assentos: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  mesa: { type: "integer", example: 12 },
                  status: { type: "string", enum: ["available", "reserved", "blocked"] }
                }
              }
            }
          }
        },
        Message: {
          type: "object",
          properties: {
            message: { type: "string" }
          }
        }
      }
    },
    paths: {
      "/health": {
        get: {
          tags: ["Health"],
          responses: {
            "200": { description: "API online" }
          }
        }
      },
      "/admin/login": {
        post: {
          tags: ["Admin Auth"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginRequest" }
              }
            }
          },
          responses: {
            "200": {
              description: "Login realizado",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/LoginResponse" }
                }
              }
            },
            "401": { description: "Credenciais inválidas" }
          }
        }
      },
      "/api/status": {
        get: {
          tags: ["API Externa"],
          security: [{ apiPinAuth: [] }],
          requestBody: {
            required: false,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    dataReserva: { type: "string", example: "2026-06-11" },
                    horarioInicio: { type: "string", example: "19:30" },
                    duracaoMinutos: { type: "integer", example: 120 }
                  }
                }
              }
            }
          },
          responses: {
            "200": {
              description: "Status das mesas",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/StatusResponse" }
                }
              }
            },
            "401": { description: "PIN inválido" }
          }
        }
      },
      "/api/reservar": {
        post: {
          tags: ["API Externa"],
          security: [{ apiPinAuth: [] }],
          responses: {
            "201": {
              description: "Reserva criada automaticamente",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ReservaResponse" }
                }
              }
            },
            "409": { description: "Nenhuma mesa disponível" }
          }
        }
      },
      "/admin/dashboard": {
        get: {
          tags: ["Admin"],
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "Dashboard",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/StatusResponse" }
                }
              }
            }
          }
        }
      },
      "/admin/reservas": {
        get: {
          tags: ["Admin"],
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "Reservas ativas",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: { $ref: "#/components/schemas/ReservaAtiva" }
                  }
                }
              }
            }
          }
        },
        post: {
          tags: ["Admin"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["mesa", "dataReserva", "horarioInicio", "duracaoMinutos"],
                  properties: {
                    mesa: { type: "integer", example: 10 },
                    dataReserva: { type: "string", example: "2026-06-11" },
                    horarioInicio: { type: "string", example: "19:30" },
                    duracaoMinutos: { type: "integer", example: 120 }
                  }
                }
              }
            }
          },
          responses: {
            "201": {
              description: "Reserva criada",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ReservaResponse" }
                }
              }
            },
            "409": { description: "Mesa ocupada" }
          }
        }
      },
      "/admin/reservas/disponibilidade": {
        get: {
          tags: ["Admin"],
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: "query", name: "dataReserva", required: true, schema: { type: "string", example: "2026-06-11" } },
            { in: "query", name: "horarioInicio", required: true, schema: { type: "string", example: "19:30" } },
            { in: "query", name: "duracaoMinutos", required: true, schema: { type: "integer", example: 120 } }
          ],
          responses: {
            "200": {
              description: "Mapa de disponibilidade",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/DisponibilidadeResponse" }
                }
              }
            }
          }
        }
      },
      "/admin/reservas/{id}": {
        delete: {
          tags: ["Admin"],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "integer" }
            }
          ],
          responses: {
            "200": {
              description: "Reserva cancelada",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Message" }
                }
              }
            },
            "404": { description: "Reserva não encontrada" }
          }
        }
      },
      "/admin/config/mesas": {
        put: {
          tags: ["Admin Config"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["totalMesas"],
                  properties: { totalMesas: { type: "integer", example: 100 } }
                }
              }
            }
          },
          responses: {
            "200": { description: "Total de mesas atualizado" },
            "409": { description: "Reservas ativas impedem redução" }
          }
        }
      },
      "/admin/config/expiracao": {
        put: {
          tags: ["Admin Config"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["duracaoMinutos"],
                  properties: { duracaoMinutos: { type: "integer", example: 120 } }
                }
              }
            }
          },
          responses: {
            "200": { description: "Expiração atualizada" }
          }
        }
      },
      "/admin/config/limpeza": {
        put: {
          tags: ["Admin Config"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["duracaoMinutos"],
                  properties: { duracaoMinutos: { type: "integer", example: 15 } }
                }
              }
            }
          },
          responses: {
            "200": { description: "Tempo de limpeza atualizado" }
          }
        }
      }
    }
  },
  apis: []
});
