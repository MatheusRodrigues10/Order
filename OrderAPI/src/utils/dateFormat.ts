export function formatDateTimeBr(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(date);
}

// Retorna componentes de data/hora em Brasília para qualquer Date (UTC).
export function brasiliaComponents(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute"), second: get("second") };
}

// Cria um Date UTC a partir de data/hora de Brasília (offset -03:00).
export function brasiliaToUTC(data: string, hora: string): Date {
  return new Date(`${data}T${hora}:00-03:00`);
}

// Retorna new Date() — o horário UTC real do servidor.
// Usar para comparações com timestamps salvos no banco (que são UTC).
export function nowUTC(): Date {
  return new Date();
}

// Retorna um Date cujos métodos locais (getHours, getDate, etc.)
// refletem o horário de Brasília, independente do fuso do servidor.
// USAR APENAS para exibição e cálculo de componentes (hora, dia da semana).
// NÃO usar para comparar com timestamps do banco.
export function nowBrasilia(): Date {
  const c = brasiliaComponents();
  return new Date(c.year, c.month - 1, c.day, c.hour, c.minute, c.second, 0);
}

// Retorna a data de hoje em Brasília como "YYYY-MM-DD".
export function hojeBrasilia(): string {
  const c = brasiliaComponents();
  return `${c.year}-${String(c.month).padStart(2, "0")}-${String(c.day).padStart(2, "0")}`;
}

// Retorna a hora atual em Brasília como "HH:MM".
export function horaBrasilia(): string {
  const c = brasiliaComponents();
  return `${String(c.hour).padStart(2, "0")}:${String(c.minute).padStart(2, "0")}`;
}

// Retorna o dia da semana em Brasília (0=Dom, 6=Sab).
export function diaSemanaEmBrasilia(): number {
  const c = brasiliaComponents();
  return new Date(c.year, c.month - 1, c.day).getDay();
}
