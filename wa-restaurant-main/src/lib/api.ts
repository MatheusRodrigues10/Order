const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("wa_token");
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  const json = await res.json();

  if (!res.ok) {
    throw new ApiError(json?.message ?? "Erro desconhecido", res.status);
  }

  return (json as { success: boolean; data: T }).data ?? json;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

// ── Auth ───────────────────────────────────────────────────────────────────────
export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ accessToken: string }>("/admin/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
  },

  // ── Admin ───────────────────────────────────────────────────────────────────
  admin: {
    dashboard: () => request<DashboardData>("/admin/dashboard"),

    // Reservas
    listarReservas: () => request<Reserva[]>("/admin/reservations"),

    criarReserva: (body: {
      mesa: number;
      quantidadePessoas: number;
      data: string;
      hora: string;
      duracaoMinutos?: number;
      nomeCliente?: string;
      telefone?: string;
    }) =>
      request<ReservaResult>("/admin/reservations", {
        method: "POST",
        body: JSON.stringify(body),
      }),

    cancelarReserva: (id: number) => request<void>(`/admin/reservations/${id}`, { method: "DELETE" }),

    // Mesas
    listarMesas: () => request<MesaInfo[]>("/admin/tables"),

    bloquearMesa: (numero: number, bloqueadaPor: string, motivo?: string) =>
      request<MesaBloqueio>(`/admin/tables/${numero}/block`, {
        method: "POST",
        body: JSON.stringify({ bloqueadaPor, motivo }),
      }),

    desbloquearMesa: (numero: number) =>
      request<void>(`/admin/tables/${numero}/block`, { method: "DELETE" }),

    // Horários de Funcionamento
    listarHorarios: () => request<HorarioFuncionamento[]>("/admin/operating-hours"),

    salvarHorario: (
      dia: number,
      turno: number,
      horaAbertura: string,
      horaFechamento: string,
      ativo = true,
    ) =>
      request<HorarioFuncionamento>(`/admin/operating-hours/${dia}/${turno}`, {
        method: "PUT",
        body: JSON.stringify({ horaAbertura, horaFechamento, ativo }),
      }),

    removerHorario: (dia: number, turno: number) =>
      request<void>(`/admin/operating-hours/${dia}/${turno}`, { method: "DELETE" }),

    // Config
    getConfig: () => request<Config>("/admin/config"),

    updateMesas: (totalMesas: number) =>
      request<{ totalMesas: number }>("/admin/config/tables", {
        method: "PUT",
        body: JSON.stringify({ totalMesas }),
      }),

    updateCapacidade: (lugaresPorMesa: number) =>
      request<{ lugaresPorMesa: number }>("/admin/config/capacity", {
        method: "PUT",
        body: JSON.stringify({ lugaresPorMesa }),
      }),

    updateExpiracao: (duracaoReservaMinutos: number) =>
      request<{ duracaoReservaMinutos: number }>("/admin/config/duration", {
        method: "PUT",
        body: JSON.stringify({ duracaoReservaMinutos }),
      }),

    updateLimpeza: (tempoLimpezaMinutos: number) =>
      request<{ tempoLimpezaMinutos: number }>("/admin/config/cleanup", {
        method: "PUT",
        body: JSON.stringify({ tempoLimpezaMinutos }),
      }),

    updateHorario: (abertura: string, fechamento: string) =>
      request<{ horarioAbertura: string; horarioFechamento: string }>("/admin/config/hours", {
        method: "PUT",
        body: JSON.stringify({ abertura, fechamento }),
      }),

    updatePin: (pin: string) =>
      request<void>("/admin/config/pin", {
        method: "PUT",
        body: JSON.stringify({ pin }),
      }),
  },
};

// ── Types ──────────────────────────────────────────────────────────────────────

export interface DashboardData {
  totalMesas: number;
  mesasLivres: number;
  mesasReservadas: number;
  mesasBloqueadas: number;
}

export interface Reserva {
  id: number;
  numeroMesa: number;
  quantidadePessoas: number;
  nomeCliente: string | null;
  telefone: string | null;
  inicioReserva: string;
  fimReserva: string;
  fimLimpeza: string;
  createdAt: string;
}

export interface ReservaResult {
  ids: number[];
  mesas: number[];
  inicio: string;
  fim: string;
  fimLimpeza: string;
}

export type MesaStatus = "available" | "reserved" | "occupied" | "cleaning" | "blocked";

export interface MesaInfo {
  numero: number;
  status: MesaStatus;
  reserva: {
    id: number;
    grupoReservaId?: string | null;
    mesasJuntadas?: number[];
    quantidadePessoas: number;
    nomeCliente?: string | null;
    telefone?: string | null;
    inicioReserva: string;
    fimReserva: string;
    fimLimpeza: string;
  } | null;
  bloqueio: {
    bloqueadaPor: string;
    motivo: string | null;
    bloqueadaEm: string;
  } | null;
}

export interface MesaBloqueio {
  numeroMesa: number;
  bloqueadaPor: string;
  motivo: string | null;
  bloqueadaEm: string;
}

export interface HorarioFuncionamento {
  id: number;
  diaSemana: number;
  diaNome: string;
  turno: number;
  turnoNome: string;
  horaAbertura: string;
  horaFechamento: string;
  ativo: boolean;
}

export interface Config {
  id: number;
  totalMesas: number;
  lugaresPorMesa: number;
  duracaoReservaMinutos: number;
  tempoLimpezaMinutos: number;
  horarioAbertura: string;
  horarioFechamento: string;
  apiPin: string;
}
