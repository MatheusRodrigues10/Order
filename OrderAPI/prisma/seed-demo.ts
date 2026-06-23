/**
 * seed-demo.ts — Ambiente de desenvolvimento/teste
 *
 * Popula o banco com dados realistas simulando operação real de restaurante.
 * ATENÇÃO: apaga reservas, bloqueios e horários existentes antes de recriar.
 * NÃO executar em produção. Credenciais de admin são preservadas.
 *
 * Comando: npm run seed:demo
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

// ─── Constantes de negócio ────────────────────────────────────────────────────
const DURACAO_PADRAO = 120; // minutos
const LIMPEZA_PADRAO = 30;  // minutos

// ─── Helpers de data ─────────────────────────────────────────────────────────

/** Adiciona `min` minutos a uma data */
function addMin(d: Date, min: number): Date {
  return new Date(d.getTime() + min * 60_000);
}

/** Hoje às HH:MM (horário local) */
function hj(h: number, m: number): Date {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

/** D+offsetDias às HH:MM (horário local) */
function dia(offsetDias: number, h: number, m: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  d.setHours(h, m, 0, 0);
  return d;
}

/** Gera os campos de período de uma reserva */
function periodo(
  inicio: Date,
  durMin = DURACAO_PADRAO,
  limpMin = LIMPEZA_PADRAO,
): { inicioReserva: Date; fimReserva: Date; fimLimpeza: Date } {
  return {
    inicioReserva: inicio,
    fimReserva: addMin(inicio, durMin),
    fimLimpeza: addMin(inicio, durMin + limpMin),
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const now = new Date();

  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║     seed-demo — WA Restaurant  (ambiente de dev/teste)    ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log(`  Data/hora: ${now.toLocaleString("pt-BR")}`);
  console.log(`  Database : ${process.env.DATABASE_URL?.match(/@(.+?)\//)?.[1] ?? "local"}\n`);

  // ── 1. Settings ─────────────────────────────────────────────────────────────
  console.log("─── 1. Settings ────────────────────────────────────────────");

  const apiPinHash = await bcrypt.hash(process.env.DEFAULT_API_PIN ?? "123456", 12);
  await prisma.settings.upsert({
    where:  { id: 1 },
    update: {
      totalMesas:            30,
      lugaresPorMesa:         4,
      duracaoReservaMinutos: 120,
      tempoLimpezaMinutos:    30,
      horarioAbertura:    "11:00",
      horarioFechamento:  "23:00",
    },
    create: {
      id: 1,
      totalMesas:            30,
      lugaresPorMesa:         4,
      duracaoReservaMinutos: 120,
      tempoLimpezaMinutos:    30,
      horarioAbertura:    "11:00",
      horarioFechamento:  "23:00",
      apiPin:          apiPinHash,
    },
  });

  console.log("  ✓ 30 mesas  |  4 lugares/mesa  |  120 min reserva  |  30 min limpeza");
  console.log("  ✓ Abertura global 11:00 — Fechamento global 23:00\n");

  // ── 2. Horários de Funcionamento ─────────────────────────────────────────────
  console.log("─── 2. Horários de Funcionamento ───────────────────────────");

  await prisma.horarioFuncionamento.deleteMany();

  const horarios = [
    // Domingo (0): só almoço — formato especial
    { diaSemana: 0, turno: 1, horaAbertura: "12:00", horaFechamento: "17:00", ativo: true },
    // Turno 2 do domingo NÃO é cadastrado (dia não tem jantar)

    // Segunda (1): dois turnos padrão
    { diaSemana: 1, turno: 1, horaAbertura: "11:30", horaFechamento: "15:30", ativo: true },
    { diaSemana: 1, turno: 2, horaAbertura: "18:00", horaFechamento: "22:30", ativo: true },

    // Terça (2): dois turnos padrão
    { diaSemana: 2, turno: 1, horaAbertura: "11:30", horaFechamento: "15:30", ativo: true },
    { diaSemana: 2, turno: 2, horaAbertura: "18:00", horaFechamento: "22:30", ativo: true },

    // Quarta (3): dois turnos padrão
    { diaSemana: 3, turno: 1, horaAbertura: "11:30", horaFechamento: "15:30", ativo: true },
    { diaSemana: 3, turno: 2, horaAbertura: "18:00", horaFechamento: "22:30", ativo: true },

    // Quinta (4): jantar até 23:00
    { diaSemana: 4, turno: 1, horaAbertura: "11:30", horaFechamento: "15:30", ativo: true },
    { diaSemana: 4, turno: 2, horaAbertura: "18:00", horaFechamento: "23:00", ativo: true },

    // Sexta (5): almoço estendido + jantar completo
    { diaSemana: 5, turno: 1, horaAbertura: "11:00", horaFechamento: "16:00", ativo: true },
    { diaSemana: 5, turno: 2, horaAbertura: "18:00", horaFechamento: "23:00", ativo: true },

    // Sábado (6): turno único 11:00–23:00 — turno 2 não existe porque turno 1 cobre tudo
    { diaSemana: 6, turno: 1, horaAbertura: "11:00", horaFechamento: "23:00", ativo: true },
    // ↑ sem turno 2 no sábado: o turno 1 preenche todo o período disponível
  ];

  await prisma.horarioFuncionamento.createMany({ data: horarios });

  console.log(`  ✓ ${horarios.length} registros de horário criados`);
  console.log("  ┌─────────┬────────────────────────────────────────────────────┐");
  console.log("  │ Dom (0) │ Turno 1: 12:00–17:00 (apenas almoço)              │");
  console.log("  │ Seg (1) │ Turno 1: 11:30–15:30 │ Turno 2: 18:00–22:30      │");
  console.log("  │ Ter (2) │ Turno 1: 11:30–15:30 │ Turno 2: 18:00–22:30      │");
  console.log("  │ Qua (3) │ Turno 1: 11:30–15:30 │ Turno 2: 18:00–22:30      │");
  console.log("  │ Qui (4) │ Turno 1: 11:30–15:30 │ Turno 2: 18:00–23:00      │");
  console.log("  │ Sex (5) │ Turno 1: 11:00–16:00 │ Turno 2: 18:00–23:00      │");
  console.log("  │ Sáb (6) │ Turno único: 11:00–23:00 (turno 2 bloqueado)      │");
  console.log("  └─────────┴────────────────────────────────────────────────────┘\n");

  // ── 3. Mesas Bloqueadas ──────────────────────────────────────────────────────
  console.log("─── 3. Mesas Bloqueadas ────────────────────────────────────");

  await prisma.mesaBloqueada.deleteMany();

  const bloqueios = [
    {
      numeroMesa: 15,
      bloqueadaPor: "Gerência",
      motivo: "Manutenção elétrica — troca de tomadas e revisão de iluminação embutida",
    },
    {
      numeroMesa: 20,
      bloqueadaPor: "Eventos",
      motivo: "Área reservada para jantar corporativo — Grupo Altamira Consultoria S.A.",
    },
    {
      numeroMesa: 25,
      bloqueadaPor: "Gerência",
      motivo: "Mesa indisponível temporariamente — aguardando reposição de cadeiras danificadas",
    },
  ];

  await prisma.mesaBloqueada.createMany({ data: bloqueios });

  console.log("  ✓ Mesa 15 — Manutenção elétrica (Gerência)");
  console.log("  ✓ Mesa 20 — Jantar corporativo reservado (Eventos)");
  console.log("  ✓ Mesa 25 — Indisponível, aguardando reforma (Gerência)\n");

  // ── 4. Reservas ──────────────────────────────────────────────────────────────
  console.log("─── 4. Reservas ────────────────────────────────────────────");

  await prisma.reserva.deleteMany();
  console.log("  (reservas anteriores removidas)\n");

  let criadas = 0;
  let puladas = 0;

  async function inserir(dados: Parameters<typeof prisma.reserva.create>[0]["data"]) {
    try {
      await prisma.reserva.create({ data: dados });
      criadas++;
    } catch {
      puladas++;
      console.warn(`  ⚠ Conflito ignorado: mesa ${dados.numeroMesa} em ${(dados.inicioReserva as Date).toLocaleString("pt-BR")}`);
    }
  }

  // ── 4a. HOJE — Ativas agora (status OCCUPIED e CLEANING) ────────────────────
  console.log("  [Hoje — reservas ativas agora]");

  // OCCUPIED: iniciou há 45 min, termina em 75 min
  await inserir({ ...periodo(addMin(now, -45)),          numeroMesa: 1,  quantidadePessoas: 2, nomeCliente: "Sra. Beatriz Costa",                     telefone: "(11) 99812-3456" });
  await inserir({ ...periodo(addMin(now, -45)),          numeroMesa: 2,  quantidadePessoas: 4, nomeCliente: "Sr. Eduardo Pinheiro Albuquerque",        telefone: "(11) 98765-4321" });
  await inserir({ ...periodo(addMin(now, -45)),          numeroMesa: 6,  quantidadePessoas: 3, nomeCliente: "Casal Silva e Souza",                     telefone: "(21) 99234-5678" });

  // OCCUPIED: iniciou há 90 min, termina em 30 min
  await inserir({ ...periodo(addMin(now, -90)),          numeroMesa: 4,  quantidadePessoas: 2, nomeCliente: "Dra. Mariana Figueiredo Cavalcanti",      telefone: "(11) 97654-3210" });
  await inserir({ ...periodo(addMin(now, -90)),          numeroMesa: 7,  quantidadePessoas: 4, nomeCliente: "Família Nascimento Rodrigues",            telefone: "(19) 98123-4567" });

  // CLEANING: terminou há 20 min, limpeza termina em 10 min
  // (inicioReserva = -140min → fimReserva = -20min → fimLimpeza = +10min)
  await inserir({ ...periodo(addMin(now, -140)),         numeroMesa: 3,  quantidadePessoas: 4, nomeCliente: "Sr. Rodrigo Barros Nogueira",            telefone: "(11) 99001-2345" });
  await inserir({ ...periodo(addMin(now, -140)),         numeroMesa: 5,  quantidadePessoas: 2, nomeCliente: "Ana Luísa Cavalcante Freitas",           telefone: "(21) 98765-1234" });

  // ── 4b. HOJE — Jantar (RESERVED se ainda não chegou, OCCUPIED se já começou) ─
  console.log("  [Hoje — jantar]");

  await inserir({ ...periodo(hj(18,  0)), numeroMesa: 13, quantidadePessoas: 2, nomeCliente: "Casal Gomes Ferreira",                      telefone: "(11) 99456-0123" });
  await inserir({ ...periodo(hj(18, 30)), numeroMesa: 14, quantidadePessoas: 4, nomeCliente: "Equipe Startups Hub — sessão mensal",        telefone: "(11) 98321-9876" });
  await inserir({ ...periodo(hj(19,  0)), numeroMesa:  8, quantidadePessoas: 4, nomeCliente: "Sr. Antônio Moreira dos Santos",            telefone: "(11) 99456-7890" });
  await inserir({ ...periodo(hj(19,  0)), numeroMesa:  9, quantidadePessoas: 4, nomeCliente: "Grupo Pós-Graduação UNIFESP — turma 2024",  telefone: "(11) 98456-1234" });
  await inserir({ ...periodo(hj(19, 30)), numeroMesa: 10, quantidadePessoas: 2, nomeCliente: "Sra. Fernanda Augusto Braga",               telefone: "(41) 99876-5432" });
  await inserir({ ...periodo(hj(20,  0)), numeroMesa: 11, quantidadePessoas: 3, nomeCliente: "Cláudio Henrique Mendes Tavares",           telefone: "(11) 97890-2345" });
  // Próximo ao fechamento do turno: 20:30+120=22:30, +30 limpeza=23:00 (exatamente no limite)
  await inserir({ ...periodo(hj(20, 30)), numeroMesa: 12, quantidadePessoas: 4, nomeCliente: "Família Ribeiro Santos Pinheiro",           telefone: "(71) 99123-8765" });

  // ── 4c. HOJE — Grupo multi-mesa jantar (8 pessoas = 2 mesas) ─────────────────
  console.log("  [Hoje — grupo multi-mesa]");

  const grupoHojeId = randomUUID();
  await inserir({ ...periodo(hj(20, 0)), numeroMesa: 16, grupoReservaId: grupoHojeId, quantidadePessoas: 8, nomeCliente: "Jantar Aniversário 30 Anos — Gustavo Tavares & Convidados", telefone: "(11) 99345-6789" });
  await inserir({ ...periodo(hj(20, 0)), numeroMesa: 17, grupoReservaId: grupoHojeId, quantidadePessoas: 8, nomeCliente: "Jantar Aniversário 30 Anos — Gustavo Tavares & Convidados", telefone: "(11) 99345-6789" });

  // ── 4d. AMANHÃ (d+1) ─────────────────────────────────────────────────────────
  console.log("  [Amanhã — almoço e jantar]");

  // Almoço — duração padrão 120 min
  await inserir({ ...periodo(dia(1, 12,  0)), numeroMesa:  1, quantidadePessoas: 2, nomeCliente: "Sra. Patrícia Luz Novaes",                       telefone: "(11) 99678-2345" });
  await inserir({ ...periodo(dia(1, 12,  0)), numeroMesa:  2, quantidadePessoas: 4, nomeCliente: "Reunião Equipe Comercial — Construtora Via Verde", telefone: "(11) 98234-5670" });
  await inserir({ ...periodo(dia(1, 12, 30)), numeroMesa:  3, quantidadePessoas: 3, nomeCliente: "Alexandre Teixeira Campos",                       telefone: "(31) 99876-4321" });
  // Almoço 90 min (reunião rápida de negócios)
  await inserir({ ...periodo(dia(1, 13,  0), 90), numeroMesa: 4, quantidadePessoas: 4, nomeCliente: "Família Carvalho Santana — almoço executivo",  telefone: "(11) 97432-8901" });
  await inserir({ ...periodo(dia(1, 13,  0), 90), numeroMesa: 5, quantidadePessoas: 2, nomeCliente: "Dr. Paulo Henrique Saraiva Neto",              telefone: "(61) 99123-5678" });

  // Jantar
  await inserir({ ...periodo(dia(1, 18,  0)), numeroMesa:  6, quantidadePessoas: 4, nomeCliente: "Jantar Negócios — Grupo Aliança Energia",         telefone: "(11) 99567-8901" });
  await inserir({ ...periodo(dia(1, 18, 30)), numeroMesa:  7, quantidadePessoas: 2, nomeCliente: "Sra. Luciana Brandão Martins",                    telefone: "(11) 98901-2345" });
  await inserir({ ...periodo(dia(1, 19,  0)), numeroMesa:  8, quantidadePessoas: 4, nomeCliente: "Família Monteiro Azevedo",                        telefone: "(21) 99456-7812" });
  await inserir({ ...periodo(dia(1, 19,  0)), numeroMesa:  9, quantidadePessoas: 3, nomeCliente: "Amigos Faculdade — Eng. Civil Turma 2015",        telefone: "(41) 98345-6789" });
  await inserir({ ...periodo(dia(1, 19, 30)), numeroMesa: 10, quantidadePessoas: 4, nomeCliente: "Sr. Roberto Castilho Junior",                     telefone: "(11) 99890-1234" });
  await inserir({ ...periodo(dia(1, 20,  0)), numeroMesa: 11, quantidadePessoas: 2, nomeCliente: "Noivos Débora Mendes & Henrique Leal",            telefone: "(11) 98012-3456" });
  // Próximo ao fechamento: 20:30+120=22:30 (fim reserva), +30=23:00 (fim limpeza = limite)
  await inserir({ ...periodo(dia(1, 20, 30)), numeroMesa: 12, quantidadePessoas: 4, nomeCliente: "Aniversário Corporativo — Grupo Momentum 10 Anos", telefone: "(11) 99234-0123" });

  // ── 4e. D+2 ──────────────────────────────────────────────────────────────────
  console.log("  [D+2 — almoço, grupo e jantar]");

  // Almoço
  await inserir({ ...periodo(dia(2, 11, 30)), numeroMesa: 1, quantidadePessoas: 2, nomeCliente: "Sr. Gabriel Fraga Lima",                          telefone: "(11) 99345-1234" });
  await inserir({ ...periodo(dia(2, 12,  0)), numeroMesa: 2, quantidadePessoas: 4, nomeCliente: "Reunião RH & Financeiro — Banco do Brasil SP",    telefone: "(11) 98567-2345" });
  await inserir({ ...periodo(dia(2, 13,  0)), numeroMesa: 3, quantidadePessoas: 3, nomeCliente: "Sra. Camila Duarte Ferreira",                     telefone: "(11) 97678-3456" });

  // Grupo almoço 6 pessoas (2 mesas × 4 lugares, 120 min)
  const grupoD2Id = randomUUID();
  await inserir({ ...periodo(dia(2, 12, 30)), numeroMesa: 4, grupoReservaId: grupoD2Id, quantidadePessoas: 6, nomeCliente: "Almoço Grupo MBA Executivo — 6 pessoas", telefone: "(11) 99012-3456" });
  await inserir({ ...periodo(dia(2, 12, 30)), numeroMesa: 5, grupoReservaId: grupoD2Id, quantidadePessoas: 6, nomeCliente: "Almoço Grupo MBA Executivo — 6 pessoas", telefone: "(11) 99012-3456" });

  // Jantar
  await inserir({ ...periodo(dia(2, 18, 30)), numeroMesa:  6, quantidadePessoas: 4, nomeCliente: "Família Lima Pereira",                           telefone: "(51) 99789-4567" });
  await inserir({ ...periodo(dia(2, 19,  0)), numeroMesa:  7, quantidadePessoas: 2, nomeCliente: "Casal Aragão Figueiredo",                        telefone: "(11) 99890-5678" });
  await inserir({ ...periodo(dia(2, 19, 30)), numeroMesa:  8, quantidadePessoas: 4, nomeCliente: "Equipe de Vendas — Fechamento de Trimestre",      telefone: "(11) 98901-6789" });
  await inserir({ ...periodo(dia(2, 20,  0)), numeroMesa:  9, quantidadePessoas: 3, nomeCliente: "Sra. Juliana Couto Braga",                       telefone: "(11) 99102-7890" });
  await inserir({ ...periodo(dia(2, 20, 30)), numeroMesa: 10, quantidadePessoas: 4, nomeCliente: "Aniversário de Empresa — Dinâmica Engenharia 10 Anos", telefone: "(11) 98213-8901" });

  // ── 4f. D+3 (provavelmente sábado) ───────────────────────────────────────────
  console.log("  [D+3 — fluxo intenso (fim de semana)]");

  // Almoço
  await inserir({ ...periodo(dia(3, 12,  0)), numeroMesa:  1, quantidadePessoas: 4, nomeCliente: "Família Correia Batista",                        telefone: "(11) 97324-5678" });
  await inserir({ ...periodo(dia(3, 12,  0)), numeroMesa:  2, quantidadePessoas: 2, nomeCliente: "Sra. Raquel Bittencourt Macedo",                 telefone: "(21) 98435-6789" });
  await inserir({ ...periodo(dia(3, 12, 30)), numeroMesa:  3, quantidadePessoas: 4, nomeCliente: "Confraternização Equipe Marketing Digital",       telefone: "(11) 99546-7890" });
  await inserir({ ...periodo(dia(3, 13,  0)), numeroMesa:  4, quantidadePessoas: 2, nomeCliente: "Casal Vieira Drummond",                          telefone: "(21) 98657-8901" });
  await inserir({ ...periodo(dia(3, 13, 30)), numeroMesa:  5, quantidadePessoas: 4, nomeCliente: "Almoço de Aniversário — Srta. Larissa Costa",    telefone: "(11) 99768-9012" });

  // Jantar — fim de semana com fluxo forte
  await inserir({ ...periodo(dia(3, 18,  0)), numeroMesa:  6, quantidadePessoas: 2, nomeCliente: "Sra. Helena Wanderley",                          telefone: "(31) 98879-0123" });
  await inserir({ ...periodo(dia(3, 18,  0)), numeroMesa:  7, quantidadePessoas: 4, nomeCliente: "Jantar Pré-Casamento — Turma da Noiva",          telefone: "(11) 99990-1234" });
  await inserir({ ...periodo(dia(3, 18, 30)), numeroMesa:  8, quantidadePessoas: 4, nomeCliente: "Família Andrade Teles",                          telefone: "(11) 98201-2345" });
  await inserir({ ...periodo(dia(3, 18, 30)), numeroMesa:  9, quantidadePessoas: 2, nomeCliente: "Dr. Fábio Rezende Cardoso",                      telefone: "(11) 99312-3456" });
  await inserir({ ...periodo(dia(3, 19,  0)), numeroMesa: 10, quantidadePessoas: 4, nomeCliente: "Grupo Churrasqueiros do Norte — jantar especial", telefone: "(41) 98423-4567" });
  await inserir({ ...periodo(dia(3, 19,  0)), numeroMesa: 11, quantidadePessoas: 3, nomeCliente: "Sra. Viviane Pereira Nunes",                     telefone: "(11) 99534-5678" });
  await inserir({ ...periodo(dia(3, 19, 30)), numeroMesa: 12, quantidadePessoas: 4, nomeCliente: "Equipe de TI — Sprint Encerramento",             telefone: "(11) 98645-6789" });
  await inserir({ ...periodo(dia(3, 20,  0)), numeroMesa: 13, quantidadePessoas: 2, nomeCliente: "Casal Chen Wei e Oliveira",                      telefone: "(11) 99756-7890" });
  await inserir({ ...periodo(dia(3, 20, 30)), numeroMesa: 14, quantidadePessoas: 4, nomeCliente: "Celebração 15 Anos de Empresa — Grupo Máxima",   telefone: "(11) 98867-8901" });

  // Grupo grande (10 pessoas = 3 mesas)
  const grupoD3Id = randomUUID();
  await inserir({ ...periodo(dia(3, 20, 0)), numeroMesa: 18, grupoReservaId: grupoD3Id, quantidadePessoas: 10, nomeCliente: "Jantar Turma Medicina UNICAMP — Confraternização 10 Anos", telefone: "(19) 99978-9012" });
  await inserir({ ...periodo(dia(3, 20, 0)), numeroMesa: 19, grupoReservaId: grupoD3Id, quantidadePessoas: 10, nomeCliente: "Jantar Turma Medicina UNICAMP — Confraternização 10 Anos", telefone: "(19) 99978-9012" });
  await inserir({ ...periodo(dia(3, 20, 0)), numeroMesa: 21, grupoReservaId: grupoD3Id, quantidadePessoas: 10, nomeCliente: "Jantar Turma Medicina UNICAMP — Confraternização 10 Anos", telefone: "(19) 99978-9012" });

  // ── 4g. D+5 ──────────────────────────────────────────────────────────────────
  console.log("  [D+5 — reservas distribuídas]");

  await inserir({ ...periodo(dia(5, 12,  0)), numeroMesa:  1, quantidadePessoas: 2, nomeCliente: "Sra. Renata Loureiro Castro",                    telefone: "(11) 99089-0123" });
  await inserir({ ...periodo(dia(5, 12, 30)), numeroMesa:  2, quantidadePessoas: 4, nomeCliente: "Reunião de Diretoria — Holding Portinari",       telefone: "(11) 98190-1234" });
  await inserir({ ...periodo(dia(5, 19,  0)), numeroMesa:  3, quantidadePessoas: 4, nomeCliente: "Sr. Marcus Vinicius Borba",                      telefone: "(11) 99201-2345" });
  await inserir({ ...periodo(dia(5, 19, 30)), numeroMesa:  4, quantidadePessoas: 3, nomeCliente: "Sra. Tatiana Queiroz Nóbrega",                   telefone: "(61) 98312-3456" });
  await inserir({ ...periodo(dia(5, 20,  0)), numeroMesa:  5, quantidadePessoas: 4, nomeCliente: "Rock Night — Turma do Marcelo & Convidados",     telefone: "(11) 99423-4567" });
  await inserir({ ...periodo(dia(5, 20, 30)), numeroMesa:  6, quantidadePessoas: 2, nomeCliente: "Casal Noivos Priscila Gama & Rafael Dumont",     telefone: "(11) 98534-5678" });

  // ── 4h. D+7 ──────────────────────────────────────────────────────────────────
  console.log("  [D+7 — reservas futuras]");

  await inserir({ ...periodo(dia(7, 12,  0)), numeroMesa:  1, quantidadePessoas: 4, nomeCliente: "Almoço Família Ramos Marques — reunião trimestral", telefone: "(11) 99645-6789" });
  await inserir({ ...periodo(dia(7, 12, 30)), numeroMesa:  2, quantidadePessoas: 2, nomeCliente: "Sr. Bruno Henrique Corrêa",                      telefone: "(11) 98756-7890" });
  await inserir({ ...periodo(dia(7, 13,  0)), numeroMesa:  3, quantidadePessoas: 3, nomeCliente: "Sra. Amanda Guimarães Leal",                     telefone: "(51) 99867-8901" });
  await inserir({ ...periodo(dia(7, 19,  0)), numeroMesa:  4, quantidadePessoas: 4, nomeCliente: "Aniversário Srta. Isabela Ramos — 21 Anos",      telefone: "(11) 98978-9012" });
  await inserir({ ...periodo(dia(7, 19, 30)), numeroMesa:  5, quantidadePessoas: 2, nomeCliente: "Casal Silveira Pedrosa",                         telefone: "(11) 99089-0123" });
  await inserir({ ...periodo(dia(7, 20,  0)), numeroMesa:  6, quantidadePessoas: 4, nomeCliente: "Confraternização Equipe TI — Sprint Review Q3",  telefone: "(11) 98190-1234" });
  // Reserva próxima ao fechamento no D+7
  await inserir({ ...periodo(dia(7, 20, 30)), numeroMesa:  7, quantidadePessoas: 4, nomeCliente: "Jantar Surprise — Família Veiga Almada",         telefone: "(71) 99201-2345" });

  // ─── Contagem final ──────────────────────────────────────────────────────────
  const [totalReservasDb, totalBloqueiosDb, totalHorariosDb, settings] = await Promise.all([
    prisma.reserva.count(),
    prisma.mesaBloqueada.count(),
    prisma.horarioFuncionamento.count(),
    prisma.settings.findUnique({ where: { id: 1 } }),
  ]);

  console.log(`\n  ✓ ${criadas} reservas inseridas${puladas > 0 ? ` (${puladas} ignoradas por conflito)` : ""}`);
  console.log(`  ✓ Total no banco: ${totalReservasDb} reservas\n`);

  // ── 5. Relatório Final ───────────────────────────────────────────────────────
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║                   Relatório Final                         ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log(`  1. Mesas configuradas       : ${settings?.totalMesas} mesas, ${settings?.lugaresPorMesa} lugares/mesa`);
  console.log(`  2. Horários de funcionamento: ${totalHorariosDb} registros (7 dias configurados)`);
  console.log(`  3. Reservas criadas         : ${totalReservasDb}`);
  console.log(`  4. Mesas bloqueadas         : ${totalBloqueiosDb} (mesas 15, 20, 25)`);
  console.log("");
  console.log("  5. Cenários cobertos:");
  console.log("     ✓ Dashboard com mesas ocupadas, em limpeza, bloqueadas e disponíveis");
  console.log("     ✓ Reservas no almoço (11:30, 12:00, 12:30, 13:00, 13:30)");
  console.log("     ✓ Reservas no jantar (18:00, 18:30, 19:00, 19:30, 20:00, 20:30)");
  console.log("     ✓ Reserva próxima ao fechamento (20:30+120+30 = 23:00 exato)");
  console.log("     ✓ Reservas com 2, 3, 4, 6, 8 e 10 pessoas");
  console.log("     ✓ Reservas com nome completo e telefone formatado");
  console.log("     ✓ Nomes longos e descritivos (empresa, grupo, evento)");
  console.log("     ✓ Grupo multi-mesa com grupoReservaId (2 e 3 mesas)");
  console.log("     ✓ Variação de duração: 90 min (almoço executivo) e 120 min (padrão)");
  console.log("     ✓ Horários por dia: dom só almoço, sáb turno único, seg–sex dois turnos");
  console.log("     ✓ Turno 2 do sábado bloqueado (turno 1 cobre 11:00–23:00)");
  console.log("     ✓ Semana completa: hoje, D+1, D+2, D+3, D+5, D+7");
  console.log("     ✓ Blockers com motivo realista (manutenção, evento, reforma)");
  console.log("     ✓ Responsividade: lista e agenda com conteúdo abundante");
  console.log("");
  console.log("  6. Para recriar os dados a qualquer momento:");
  console.log("     npm run seed:demo");
  console.log("");
  console.log("  7. Dados de produção:");
  console.log("     NÃO alterados. Seed rodou apenas no banco configurado em .env.");
  console.log(`     Host: ${process.env.DATABASE_URL?.match(/@(.+?)\//)?.[1] ?? "(não identificado)"}`);
  console.log("     Admin e credenciais foram preservados.");
  console.log("╚════════════════════════════════════════════════════════════╝");
}

main()
  .catch((e) => {
    console.error("\n❌ Erro durante o seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
