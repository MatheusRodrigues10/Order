import { AppError } from "../utils/AppError";
import { IntegradorSessionStore } from "./integradorSessionStore";
import { DisponibilidadeService } from "./disponibilidadeService";
import { ReservaService } from "./reservaService";
import type {
  FluxoReserva,
  IntegradorSession,
  IntegradorStepResponse,
  ReservaConfirmada
} from "../types/integrador";

const RESTAURANTE = {
  nome: "WA Restaurant",
  endereco: "R. Damásio Mascarenhas, 160 — Santana, São Paulo",
  telefone: "(11) 2978-5034"
};

const FLUXO_ETAPAS: Record<FluxoReserva, string[]> = {
  reserva_a: [
    "iniciar",
    "informar_pessoas",
    "disponibilidade_semana",
    "selecionar_horario",
    "informar_dados_cliente",
    "resumo",
    "confirmar",
    "concluido"
  ],
  reserva_b: [
    "iniciar",
    "informar_pessoas",
    "disponibilidade_semana",
    "informar_data_especifica",
    "disponibilidade_data",
    "selecionar_horario",
    "informar_dados_cliente",
    "resumo",
    "confirmar",
    "concluido"
  ]
};

export class IntegradorReservaService {
  constructor(
    private readonly sessions = new IntegradorSessionStore(),
    private readonly disponibilidade = new DisponibilidadeService(),
    private readonly reservaService = new ReservaService()
  ) {}

  listarFluxos() {
    return {
      reserva_a: {
        nome: "Reserva — semana atual",
        descricao: "Cliente escolhe horário entre as opções disponíveis desta semana.",
        etapas: FLUXO_ETAPAS.reserva_a
      },
      reserva_b: {
        nome: "Reserva — outra data",
        descricao: "Cliente pode recusar a semana atual e solicitar uma data específica.",
        etapas: FLUXO_ETAPAS.reserva_b
      }
    };
  }

  iniciar(fluxo: FluxoReserva): IntegradorStepResponse {
    const session = this.sessions.create(fluxo);
    const atualizado = this.sessions.update(session.sessionId, { etapaAtual: "informar_pessoas" });

    return this.buildResponse(atualizado, {
      mensagem: `Olá! Bem-vindo ao ${RESTAURANTE.nome}. Fluxo '${fluxo}' iniciado.`,
      opcoesMenu: [
        "1 · Fazer uma reserva",
        "2 · Conhecer o restaurante",
        "3 · Reservar para um evento"
      ],
      acaoEsperada: "Informe quantidadePessoas (mínimo 1)."
    });
  }

  informarPessoas(fluxo: FluxoReserva, sessionId: string, quantidadePessoas: number): IntegradorStepResponse {
    const session = this.requireEtapa(fluxo, sessionId, "informar_pessoas");

    if (quantidadePessoas < 1) {
      throw new AppError("quantidadePessoas deve ser no mínimo 1", 400);
    }

    const atualizado = this.sessions.update(sessionId, {
      quantidadePessoas,
      etapaAtual: "disponibilidade_semana"
    });

    return this.buildResponse(atualizado, {
      mensagem: `Quantidade registrada: ${quantidadePessoas} pessoa(s).`,
      acaoEsperada: fluxo === "reserva_b"
        ? "Consulte disponibilidade_semana; o cliente pode escolher um horário da semana ou informar outra data."
        : "Consulte disponibilidade_semana e apresente as opções ao cliente."
    });
  }

  async disponibilidadeSemana(fluxo: FluxoReserva, sessionId: string): Promise<IntegradorStepResponse> {
    const session = this.requireEtapa(fluxo, sessionId, "disponibilidade_semana");
    if (!session.quantidadePessoas) {
      throw new AppError("quantidadePessoas não definida na sessão", 409);
    }

    const opcoes = await this.disponibilidade.listarSemanaAtual(session.quantidadePessoas);

    if (opcoes.length === 0) {
      throw new AppError("Nenhuma opção disponível nesta semana", 404);
    }

    const etapasPermitidas =
      fluxo === "reserva_b"
        ? ["selecionar_horario", "informar_data_especifica"]
        : ["selecionar_horario"];

    return this.buildResponse(session, {
      mensagem: `Opções desta semana para ${session.quantidadePessoas} pessoa(s).`,
      opcoes,
      acaoEsperada:
        fluxo === "reserva_b"
          ? "Cliente escolhe um horário da semana (selecionar_horario) ou informa outra data (informar_data_especifica)."
          : "Cliente escolhe data e hora via selecionar_horario."
    }, etapasPermitidas);
  }

  informarDataEspecifica(fluxo: FluxoReserva, sessionId: string, data: string): IntegradorStepResponse {
    if (fluxo !== "reserva_b") {
      throw new AppError("Data específica só é permitida no fluxo reserva_b", 400);
    }

    const session = this.requireEtapa(fluxo, sessionId, "disponibilidade_semana");
    const atualizado = this.sessions.update(sessionId, {
      data,
      etapaAtual: "disponibilidade_data"
    });

    return this.buildResponse(atualizado, {
      mensagem: `Data ${data} registrada. Consulte disponibilidade_data para listar horários.`,
      acaoEsperada: "Chame disponibilidade_data e apresente os horários ao cliente."
    });
  }

  async disponibilidadeData(fluxo: FluxoReserva, sessionId: string): Promise<IntegradorStepResponse> {
    if (fluxo !== "reserva_b") {
      throw new AppError("Disponibilidade por data só existe no fluxo reserva_b", 400);
    }

    const session = this.requireEtapa(fluxo, sessionId, "disponibilidade_data");
    if (!session.quantidadePessoas || !session.data) {
      throw new AppError("Sessão incompleta — informe pessoas e data antes", 409);
    }

    const slot = await this.disponibilidade.listarHorariosData(session.quantidadePessoas, session.data);
    const atualizado = this.sessions.update(sessionId, { etapaAtual: "selecionar_horario" });

    return this.buildResponse(atualizado, {
      mensagem: `Horários disponíveis em ${slot.dataFormatada} para ${session.quantidadePessoas} pessoa(s).`,
      opcao: slot,
      acaoEsperada: "Cliente escolhe horário via selecionar_horario."
    });
  }

  async selecionarHorario(
    fluxo: FluxoReserva,
    sessionId: string,
    data: string,
    hora: string
  ): Promise<IntegradorStepResponse> {
    const session = this.getSessionForHorario(fluxo, sessionId);
    if (!session.quantidadePessoas) {
      throw new AppError("quantidadePessoas não definida na sessão", 409);
    }

    await this.disponibilidade.validarHorarioDisponivel(session.quantidadePessoas, data, hora);

    const atualizado = this.sessions.update(sessionId, {
      data,
      hora,
      etapaAtual: "informar_dados_cliente"
    });

    return this.buildResponse(atualizado, {
      mensagem: `Horário selecionado: ${data} às ${hora}.`,
      acaoEsperada: "Informe nomeCliente (obrigatório) e telefone (opcional)."
    });
  }

  informarDadosCliente(
    fluxo: FluxoReserva,
    sessionId: string,
    nomeCliente: string,
    telefone?: string
  ): IntegradorStepResponse {
    const session = this.requireEtapa(fluxo, sessionId, "informar_dados_cliente");

    if (!nomeCliente.trim()) {
      throw new AppError("nomeCliente é obrigatório", 400);
    }

    const atualizado = this.sessions.update(sessionId, {
      nomeCliente: nomeCliente.trim(),
      telefone: telefone?.trim(),
      etapaAtual: "resumo"
    });

    return this.buildResponse(atualizado, {
      mensagem: "Dados do cliente registrados.",
      acaoEsperada: "Apresente o resumo e aguarde confirmação do cliente."
    });
  }

  resumo(fluxo: FluxoReserva, sessionId: string): IntegradorStepResponse {
    const session = this.requireEtapa(fluxo, sessionId, "resumo");
    this.assertReservaCompleta(session);

    const resumoData = this.montarResumo(session);
    const atualizado = this.sessions.update(sessionId, { etapaAtual: "confirmar" });

    return this.buildResponse(atualizado, {
      mensagem: "Resumo da reserva para confirmação do cliente.",
      resumo: resumoData,
      opcoesConfirmacao: ["Sim, pode confirmar!", "Preciso alterar algo"],
      acaoEsperada: "Cliente confirma ou rejeita via confirmar."
    });
  }

  async confirmar(fluxo: FluxoReserva, sessionId: string, confirmar: boolean): Promise<IntegradorStepResponse> {
    const session = this.requireEtapa(fluxo, sessionId, "confirmar");
    this.assertReservaCompleta(session);

    if (!confirmar) {
      const atualizado = this.sessions.update(sessionId, { etapaAtual: "informar_dados_cliente" });
      return this.buildResponse(atualizado, {
        mensagem: "Confirmação rejeitada pelo cliente.",
        acaoEsperada: "Retorne a informar_dados_cliente ou reinicie seleção de horário."
      });
    }

    const result = await this.reservaService.reserveFlexible(
      session.quantidadePessoas!,
      session.data!,
      session.hora!,
      session.nomeCliente,
      session.telefone
    );

    const reservaConfirmada: ReservaConfirmada = {
      ids: result.ids,
      mesas: result.mesas,
      quantidadePessoas: session.quantidadePessoas!,
      data: session.data!,
      hora: session.hora!,
      nomeCliente: session.nomeCliente!,
      telefone: session.telefone,
      inicio: result.inicio.toISOString(),
      fim: result.fim.toISOString(),
      endereco: RESTAURANTE.endereco,
      telefoneRestaurante: RESTAURANTE.telefone
    };

    const atualizado = this.sessions.update(sessionId, {
      etapaAtual: "concluido",
      reservaConfirmada
    });

    return this.buildResponse(atualizado, {
      mensagem: `Reserva confirmada para ${session.nomeCliente}!`,
      reserva: reservaConfirmada
    });
  }

  obterReserva(fluxo: FluxoReserva, sessionId: string): IntegradorStepResponse {
    const session = this.sessions.get(sessionId, fluxo);

    if (session.etapaAtual !== "concluido" || !session.reservaConfirmada) {
      throw new AppError("Reserva ainda não foi confirmada nesta sessão", 409);
    }

    return this.buildResponse(session, {
      reserva: session.reservaConfirmada
    });
  }

  estado(fluxo: FluxoReserva, sessionId: string): IntegradorStepResponse {
    const session = this.sessions.get(sessionId, fluxo);
    const conteudo: Record<string, unknown> = {
      quantidadePessoas: session.quantidadePessoas ?? null,
      data: session.data ?? null,
      hora: session.hora ?? null,
      nomeCliente: session.nomeCliente ?? null,
      telefone: session.telefone ?? null,
      reservaConfirmada: session.reservaConfirmada ?? null
    };

    return this.buildResponse(session, conteudo);
  }

  cancelar(fluxo: FluxoReserva, sessionId: string) {
    this.sessions.get(sessionId, fluxo);
    this.sessions.delete(sessionId);
  }

  private getSessionForHorario(fluxo: FluxoReserva, sessionId: string) {
    const session = this.sessions.get(sessionId, fluxo);
    const etapasValidas =
      fluxo === "reserva_b"
        ? ["disponibilidade_semana", "selecionar_horario"]
        : ["disponibilidade_semana", "selecionar_horario"];

    if (!etapasValidas.includes(session.etapaAtual)) {
      throw new AppError(
        `Etapa atual '${session.etapaAtual}' não permite selecionar horário. Etapas válidas: ${etapasValidas.join(", ")}`,
        409
      );
    }

    return session;
  }

  private requireEtapa(fluxo: FluxoReserva, sessionId: string, etapa: IntegradorSession["etapaAtual"]) {
    const session = this.sessions.get(sessionId, fluxo);
    if (session.etapaAtual !== etapa) {
      throw new AppError(
        `Etapa atual '${session.etapaAtual}' — esperado '${etapa}'. Use GET .../estado para recuperar o fluxo.`,
        409
      );
    }
    return session;
  }

  private assertReservaCompleta(session: IntegradorSession) {
    if (!session.quantidadePessoas || !session.data || !session.hora || !session.nomeCliente) {
      throw new AppError("Dados incompletos para resumo/confirmação", 409);
    }
  }

  private montarResumo(session: IntegradorSession) {
    return {
      data: session.data,
      hora: session.hora,
      quantidadePessoas: session.quantidadePessoas,
      nomeCliente: session.nomeCliente,
      telefone: session.telefone ?? null,
      endereco: RESTAURANTE.endereco
    };
  }

  private buildResponse(
    session: IntegradorSession,
    conteudo: Record<string, unknown>,
    etapasPermitidas?: string[]
  ): IntegradorStepResponse {
    const etapas = FLUXO_ETAPAS[session.fluxo];
    const idx = etapas.indexOf(session.etapaAtual);
    const proximaEtapa = idx >= 0 && idx < etapas.length - 1 ? etapas[idx + 1] : null;

    return {
      sessionId: session.sessionId,
      fluxo: session.fluxo,
      etapaAtual: session.etapaAtual,
      proximaEtapa: proximaEtapa as IntegradorStepResponse["proximaEtapa"],
      etapasPermitidas: etapasPermitidas ?? (proximaEtapa ? [proximaEtapa] : []),
      conteudo
    };
  }
}
