export type FluxoReserva = "reserva_a" | "reserva_b";

export type EtapaReservaA =
  | "iniciar"
  | "informar_pessoas"
  | "disponibilidade_semana"
  | "selecionar_horario"
  | "informar_dados_cliente"
  | "resumo"
  | "confirmar"
  | "concluido";

export type EtapaReservaB =
  | "iniciar"
  | "informar_pessoas"
  | "disponibilidade_semana"
  | "informar_data_especifica"
  | "disponibilidade_data"
  | "selecionar_horario"
  | "informar_dados_cliente"
  | "resumo"
  | "confirmar"
  | "concluido";

export type EtapaFluxo = EtapaReservaA | EtapaReservaB;

export interface SlotDisponivel {
  data: string;
  dataFormatada: string;
  diaSemana: string;
  horarios: string[];
}

export interface ReservaConfirmada {
  ids: number[];
  mesas: number[];
  quantidadePessoas: number;
  data: string;
  hora: string;
  nomeCliente: string;
  telefone?: string;
  inicio: string;
  fim: string;
  endereco: string;
  telefoneRestaurante: string;
}

export interface IntegradorSession {
  sessionId: string;
  fluxo: FluxoReserva;
  etapaAtual: EtapaFluxo;
  quantidadePessoas?: number;
  data?: string;
  hora?: string;
  nomeCliente?: string;
  telefone?: string;
  reservaConfirmada?: ReservaConfirmada;
  createdAt: Date;
  expiresAt: Date;
}

export interface IntegradorStepResponse {
  sessionId: string;
  fluxo: FluxoReserva;
  etapaAtual: EtapaFluxo;
  proximaEtapa: EtapaFluxo | null;
  etapasPermitidas: string[];
  conteudo: Record<string, unknown>;
}
