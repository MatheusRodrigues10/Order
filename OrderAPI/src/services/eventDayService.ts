import { AppError } from "../utils/AppError";
import { EventDayRepository } from "../repositories/eventDayRepository";
import { formatDateTimeBr } from "../utils/dateFormat";

const dataRegex = /^\d{4}-\d{2}-\d{2}$/;

const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export class EventDayService {
  constructor(
    private readonly repo = new EventDayRepository()
  ) {}

  async listar() {
    const rows = await this.repo.findAll();
    return rows.map(this.format);
  }

  async criar(data: string, nomeCliente: string, telefone: string, motivo?: string) {
    this.validateData(data);

    const existente = await this.repo.findByData(data);
    if (existente) {
      throw new AppError(`O dia ${this.formatDataLabel(data)} já está reservado para evento`, 409);
    }

    const row = await this.repo.create(data, nomeCliente.trim(), telefone.trim(), motivo?.trim());
    return this.format(row);
  }

  async remover(data: string) {
    this.validateData(data);

    const existente = await this.repo.findByData(data);
    if (!existente) {
      throw new AppError(`Nenhum evento encontrado para ${this.formatDataLabel(data)}`, 404);
    }

    await this.repo.delete(data);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private format(row: {
    id: number;
    data: string;
    motivo: string | null;
    nomeCliente: string;
    telefone: string;
    createdAt: Date;
  }) {
    const [y, m, d] = row.data.split("-").map(Number);
    const dataObj = new Date(y, m - 1, d);
    const diaSemana = dataObj.getDay();
    const passado = dataObj < new Date(new Date().setHours(0, 0, 0, 0));

    return {
      id: row.id,
      data: row.data,
      dataFormatada: `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`,
      dataExtenso: `${DIAS_SEMANA[diaSemana]}, ${d} de ${MESES[m - 1]} de ${y}`,
      diaSemana,
      diaSemanaNome: DIAS_SEMANA[diaSemana],
      motivo: row.motivo ?? null,
      nomeCliente: row.nomeCliente,
      telefone: row.telefone,
      passado,
      criadoEm: formatDateTimeBr(row.createdAt)
    };
  }

  private validateData(data: string) {
    if (!dataRegex.test(data)) {
      throw new AppError("Formato de data inválido, use YYYY-MM-DD", 400);
    }
    const [y, m, d] = data.split("-").map(Number);
    const parsed = new Date(y, m - 1, d);
    if (
      parsed.getFullYear() !== y ||
      parsed.getMonth() + 1 !== m ||
      parsed.getDate() !== d
    ) {
      throw new AppError("Data inválida", 400);
    }
  }

  private formatDataLabel(data: string) {
    const [y, m, d] = data.split("-").map(Number);
    return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
  }
}
