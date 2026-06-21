import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type HorarioFuncionamento, ApiError } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Save, Loader2, Trash2, Plus, RefreshCw, Ban } from "lucide-react";

export const Route = createFileRoute("/operating-hours")({
  head: () => ({ meta: [{ title: "Funcionamento — WA Restaurant" }] }),
  component: OperatingHoursPage,
});

const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const TURNOS = [
  { turno: 1, nome: "Almoço" },
  { turno: 2, nome: "Jantar" },
];

type TurnoKey = `${number}-${number}`;
type TurnoForm = { horaAbertura: string; horaFechamento: string; ativo: boolean };

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function OperatingHoursPage() {
  const queryClient = useQueryClient();
  const {
    data: horarios = [],
    isLoading,
    refetch,
  } = useQuery<HorarioFuncionamento[]>({
    queryKey: ["operating-hours"],
    queryFn: api.admin.listarHorarios,
  });

  const [forms, setForms] = useState<Record<TurnoKey, TurnoForm>>({});
  const [saving, setSaving] = useState<TurnoKey | null>(null);
  const [removing, setRemoving] = useState<TurnoKey | null>(null);

  const getExisting = (dia: number, turno: number) =>
    horarios.find((h) => h.diaSemana === dia && h.turno === turno) ?? null;

  const key = (dia: number, turno: number): TurnoKey => `${dia}-${turno}`;

  const getForm = (dia: number, turno: number): TurnoForm => {
    const k = key(dia, turno);
    if (forms[k]) return forms[k];
    const h = getExisting(dia, turno);
    return h
      ? { horaAbertura: h.horaAbertura, horaFechamento: h.horaFechamento, ativo: h.ativo }
      : turno === 1
        ? { horaAbertura: "11:30", horaFechamento: "15:00", ativo: true }
        : { horaAbertura: "18:00", horaFechamento: "23:00", ativo: true };
  };

  const setField = (
    dia: number,
    turno: number,
    field: keyof TurnoForm,
    value: string | boolean,
  ) => {
    const k = key(dia, turno);
    setForms((prev) => ({ ...prev, [k]: { ...getForm(dia, turno), [field]: value } }));
  };

  const startEditing = (dia: number, turno: number) => {
    const k = key(dia, turno);
    const h = getExisting(dia, turno);
    setForms((prev) => ({
      ...prev,
      [k]: h
        ? { horaAbertura: h.horaAbertura, horaFechamento: h.horaFechamento, ativo: h.ativo }
        : turno === 1
          ? { horaAbertura: "11:30", horaFechamento: "15:00", ativo: true }
          : { horaAbertura: "18:00", horaFechamento: "23:00", ativo: true },
    }));
  };

  const cancelEditing = (dia: number, turno: number) => {
    const k = key(dia, turno);
    setForms((prev) => {
      const n = { ...prev };
      delete n[k];
      return n;
    });
  };

  // Fecha automaticamente o form do turno 2 quando fica bloqueado pelo turno 1
  useEffect(() => {
    setForms((prev) => {
      const next = { ...prev };
      let changed = false;
      for (let dia = 0; dia < 7; dia++) {
        const k2 = key(dia, 2) as TurnoKey;
        if (!next[k2]) continue;

        // Fechamento efetivo do turno 1 (form ou salvo)
        const k1 = key(dia, 1) as TurnoKey;
        let fech1: string | null = null;
        if (prev[k1]) {
          fech1 = prev[k1].ativo ? prev[k1].horaFechamento : null;
        } else {
          const ex1 = horarios.find((h) => h.diaSemana === dia && h.turno === 1);
          fech1 = ex1?.ativo ? ex1.horaFechamento : null;
        }
        if (!fech1) continue;

        // Abertura efetiva do turno 2 (form ou salvo)
        const aber2 =
          prev[k2]?.horaAbertura ??
          horarios.find((h) => h.diaSemana === dia && h.turno === 2)?.horaAbertura ??
          "18:00";

        if (toMin(fech1) >= toMin(aber2)) {
          delete next[k2];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [forms, horarios]);

  // ── Lógica de bloqueio do turno 2 ──────────────────────────────────────────

  /** Retorna o fechamento efetivo do turno 1 para um dia (inclui edições não salvas). */
  function getTurno1Fechamento(dia: number): string | null {
    const k1 = key(dia, 1);
    // Prioriza o valor do form se estiver sendo editado
    if (forms[k1]) return forms[k1].ativo ? forms[k1].horaFechamento : null;
    const existing = getExisting(dia, 1);
    return existing?.ativo ? existing.horaFechamento : null;
  }

  /** Retorna a abertura efetiva do turno 2 para um dia (inclui edições não salvas). */
  function getTurno2Abertura(dia: number): string {
    const k2 = key(dia, 2);
    if (forms[k2]) return forms[k2].horaAbertura;
    const existing = getExisting(dia, 2);
    return existing?.horaAbertura ?? "18:00";
  }

  /**
   * Turno 2 fica bloqueado se o fechamento do turno 1 alcança ou ultrapassa
   * a abertura do turno 2 (configurada ou padrão 18:00).
   */
  function isTurno2Bloqueado(dia: number): boolean {
    const fech1 = getTurno1Fechamento(dia);
    if (!fech1) return false;
    const aber2 = getTurno2Abertura(dia);
    return toMin(fech1) >= toMin(aber2);
  }

  // ── Salvar / remover ────────────────────────────────────────────────────────

  const handleSave = async (dia: number, turno: number) => {
    const k = key(dia, turno);
    const form = getForm(dia, turno);

    // Validação local: turno 1 não pode invadir turno 2 (feedback imediato)
    if (turno === 1) {
      const turno2Aber = getTurno2Abertura(dia);
      const existing2 = getExisting(dia, 2);
      if (existing2?.ativo && toMin(form.horaFechamento) >= toMin(turno2Aber)) {
        toast.error(
          `Fim do Almoço (${form.horaFechamento}) invade o Jantar (${turno2Aber}). Remova o Jantar antes ou reduza o horário do Almoço.`,
        );
        return;
      }
    }

    // Validação local: turno 2 não pode começar antes ou junto do turno 1
    if (turno === 2) {
      const fech1 = getTurno1Fechamento(dia);
      if (fech1 && toMin(form.horaAbertura) <= toMin(fech1)) {
        toast.error(
          `Início do Jantar (${form.horaAbertura}) deve ser após o fim do Almoço (${fech1}).`,
        );
        return;
      }
    }

    if (form.ativo && toMin(form.horaFechamento) <= toMin(form.horaAbertura)) {
      toast.error("Horário de fechamento deve ser após o horário de abertura");
      return;
    }

    setSaving(k);
    try {
      await api.admin.salvarHorario(dia, turno, form.horaAbertura, form.horaFechamento, form.ativo);
      toast.success(`${DAYS[dia]} — ${turno === 1 ? "Almoço" : "Jantar"} salvo`);
      await queryClient.invalidateQueries({ queryKey: ["operating-hours"] });
      cancelEditing(dia, turno);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao salvar horário");
    } finally {
      setSaving(null);
    }
  };

  const handleRemove = async (dia: number, turno: number) => {
    const k = key(dia, turno);
    setRemoving(k);
    try {
      await api.admin.removerHorario(dia, turno);
      toast.success(`Configuração removida`);
      await queryClient.invalidateQueries({ queryKey: ["operating-hours"] });
      cancelEditing(dia, turno);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao remover horário");
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-6 md:px-8 md:py-10">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.32em] text-gold">Operação</p>
          <h1 className="mt-1 font-display text-3xl md:text-4xl text-foreground">
            Horários de funcionamento
          </h1>
          <p className="mt-2 max-w-prose text-sm text-muted-foreground">
            Cada dia pode ter até 2 turnos (Almoço e Jantar). Dias sem configuração aceitam reservas
            em qualquer horário.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-1 text-muted-foreground transition-colors hover:text-foreground"
          title="Atualizar"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </header>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando horários…</p>}

      {!isLoading && (
        <div className="space-y-3">
          {DAYS.map((day, dia) => {
            const bloqueado2 = isTurno2Bloqueado(dia);
            const fech1 = getTurno1Fechamento(dia);

            return (
              <div key={day} className="rounded-md border border-border/60 bg-card p-4">
                <h3 className="mb-3 font-display text-lg text-foreground">{day}</h3>

                <div className="grid gap-3 md:grid-cols-2">
                  {TURNOS.map(({ turno, nome }) => {
                    const k = key(dia, turno);
                    const existing = getExisting(dia, turno);
                    const editing = !!forms[k];
                    const form = getForm(dia, turno);
                    const isSaving = saving === k;
                    const isRemoving = removing === k;

                    // ── Turno 2 bloqueado pelo turno 1 ──────────────────────
                    if (turno === 2 && bloqueado2) {
                      return (
                        <div
                          key={turno}
                          className="rounded-md border border-border/30 bg-background/20 p-3"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase tracking-[0.22em] text-gold/50">
                              {nome}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                              <Ban className="h-3 w-3" />
                              Indisponível
                            </span>
                          </div>
                          <p className="mt-1.5 text-[11px] text-muted-foreground/70">
                            O Almoço cobre este período (encerra às{" "}
                            <span className="font-medium text-muted-foreground">{fech1}</span>
                            ). Reduza o horário do Almoço para liberar o Jantar.
                          </p>
                        </div>
                      );
                    }

                    // ── Turno normal ─────────────────────────────────────────
                    return (
                      <div
                        key={turno}
                        className="rounded-md border border-border/40 bg-background/40 p-3"
                      >
                        {/* Linha de resumo */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase tracking-[0.22em] text-gold">
                              {nome}
                            </span>
                            {existing && (
                              <span
                                className={`text-[10px] ${existing.ativo ? "text-status-available" : "text-muted-foreground"}`}
                              >
                                {existing.ativo
                                  ? `${existing.horaAbertura} – ${existing.horaFechamento}`
                                  : "Fechado"}
                              </span>
                            )}
                            {!existing && (
                              <span className="text-[10px] text-muted-foreground">
                                Não configurado
                              </span>
                            )}
                          </div>

                          {!editing && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-xs"
                              onClick={() => startEditing(dia, turno)}
                            >
                              {existing ? (
                                "Editar"
                              ) : (
                                <>
                                  <Plus className="h-3 w-3 mr-1" />
                                  Configurar
                                </>
                              )}
                            </Button>
                          )}
                        </div>

                        {/* Formulário inline */}
                        {editing && (
                          <div className="mt-3 space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                                  Abertura
                                </Label>
                                <Input
                                  type="time"
                                  value={form.horaAbertura}
                                  onChange={(e) =>
                                    setField(dia, turno, "horaAbertura", e.target.value)
                                  }
                                  disabled={isSaving || !form.ativo}
                                  className="mt-0.5 h-8 text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                                  Fechamento
                                </Label>
                                <Input
                                  type="time"
                                  value={form.horaFechamento}
                                  onChange={(e) =>
                                    setField(dia, turno, "horaFechamento", e.target.value)
                                  }
                                  disabled={isSaving || !form.ativo}
                                  className="mt-0.5 h-8 text-sm"
                                />
                              </div>
                            </div>

                            {/* Aviso: fechamento não pode ser antes ou igual à abertura */}
                            {form.ativo &&
                              form.horaFechamento &&
                              form.horaAbertura &&
                              toMin(form.horaFechamento) <= toMin(form.horaAbertura) && (
                                <p className="rounded-md border border-destructive/30 bg-destructive/5 px-2.5 py-2 text-[11px] text-destructive">
                                  O fechamento deve ser após a abertura.
                                </p>
                              )}

                            {/* Aviso inline quando turno 1 invade turno 2 (antes de salvar) */}
                            {turno === 1 &&
                              (() => {
                                const existing2 = getExisting(dia, 2);
                                if (!existing2?.ativo) return null;
                                const aber2 = getTurno2Abertura(dia);
                                if (toMin(form.horaFechamento) < toMin(aber2)) return null;
                                return (
                                  <p className="rounded-md border border-destructive/30 bg-destructive/5 px-2.5 py-2 text-[11px] text-destructive">
                                    Este horário vai invadir o Jantar configurado ({aber2}). Salvar
                                    será bloqueado.
                                  </p>
                                );
                              })()}

                            <div className="flex flex-wrap items-center gap-2">
                              <Button
                                size="sm"
                                variant={form.ativo ? "outline" : "secondary"}
                                className="h-7 text-xs"
                                disabled={isSaving}
                                onClick={() => setField(dia, turno, "ativo", !form.ativo)}
                              >
                                {form.ativo ? "Marcar fechado" : "Marcar aberto"}
                              </Button>

                              <Button
                                size="sm"
                                className="h-7 text-xs"
                                disabled={isSaving}
                                onClick={() => handleSave(dia, turno)}
                              >
                                {isSaving ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Save className="h-3 w-3" />
                                )}
                                Salvar
                              </Button>

                              {existing && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs text-destructive hover:text-destructive"
                                  disabled={isSaving || isRemoving}
                                  onClick={() => handleRemove(dia, turno)}
                                >
                                  {isRemoving ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3 w-3" />
                                  )}
                                  Remover
                                </Button>
                              )}

                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs"
                                disabled={isSaving}
                                onClick={() => cancelEditing(dia, turno)}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
