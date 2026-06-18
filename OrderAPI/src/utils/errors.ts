import { AppError } from "./AppError";

export class MesaBloqueadaError extends AppError {
  constructor(numeroMesa: number, bloqueadaPor?: string, motivo?: string) {
    super(
      `Mesa ${numeroMesa} está bloqueada${bloqueadaPor ? ` por ${bloqueadaPor}` : ""}`,
      423,
      { numeroMesa, bloqueadaPor, motivo }
    );
    this.name = "MesaBloqueadaError";
  }
}

export class MesaJaReservadaError extends AppError {
  constructor(numeroMesa: number) {
    super(`Mesa ${numeroMesa} já está reservada para o período selecionado`, 409, { numeroMesa });
    this.name = "MesaJaReservadaError";
  }
}

export class MesaNaoEncontradaError extends AppError {
  constructor(numeroMesa: number) {
    super(`Mesa ${numeroMesa} não encontrada`, 404, { numeroMesa });
    this.name = "MesaNaoEncontradaError";
  }
}

export class ReservaNaoEncontradaError extends AppError {
  constructor(id: number) {
    super(`Reserva ${id} não encontrada`, 404, { id });
    this.name = "ReservaNaoEncontradaError";
  }
}

export class BloqueioInvalidoError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 422, details);
    this.name = "BloqueioInvalidoError";
  }
}

export class DesbloqueioInvalidoError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 422, details);
    this.name = "DesbloqueioInvalidoError";
  }
}
