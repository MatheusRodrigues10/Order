import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type HorarioFuncionamento, ApiError } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Save, Loader2, Trash2, Plus, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/operating-hours")({
  head: () => ({ meta: [{ title: "Funcionamento — WA Restaurant" }] }),
  component: OperatingHoursPage,
});

const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const TURNOS = [
  { turno: 1, nome: "Almoço" },
  { turno: 2, nome: "Jantar" },
];

type TurnoKey = `${number}-${number}`; // `${dia}-${turno}`
type TurnoForm = { horaAbertura: string; horaFechamento: string; ativo: boolean };

function OperatingHoursPage() {
  const queryClient = useQueryClient();
  const { data: horarios = [], isLoading, refetch } = useQuery<HorarioFuncionamento[]>({
    queryKey: ["horarios-funcionamento"],
    queryFn: api.admin.listarHorarios,
  });

  // Inline edit forms indexed by `${dia}-${turno}`
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

  const setField = (dia: number, turno: number, field: keyof TurnoForm, value: string | boolean) => {
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
    setForms((prev) => { const n = { ...prev }; delete n[k]; return n; });
  };

  const handleSave = async (dia: number, turno: number) => {
    const k = key(dia, turno);
    const form = getForm(dia, turno);
    setSaving(k);
    try {
      await api.admin.salvarHorario(dia, turno, form.horaAbertura, form.horaFechamento, form.ativo);
      toast.success(`${DAYS[dia]} — ${turno === 1 ? "Almoço" : "Jantar"} salvo`);
      await queryClient.invalidateQueries({ queryKey: ["horarios-funcionamento"] });
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
      await queryClient.invalidateQueries({ queryKey: ["horarios-funcionamento"] });
      cancelEditing(dia, turno);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao remover horário");
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-6 md:px-8 md:py-10">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.32em] text-gold">Operação</p>
          <h1 className="mt-1 font-display text-4xl text-foreground">Horários de funcionamento</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Cada dia pode ter até 2 turnos (Almoço e Jantar). Dias sem configuração seguem o padrão global.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="text-muted-foreground transition-colors hover:text-foreground"
          title="Atualizar"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </header>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Carregando horários…</p>
      )}

      {!isLoading && (
        <div className="space-y-3">
          {DAYS.map((day, dia) => (
            <div key={day} className="rounded-md border border-border/60 bg-card p-4">
              {/* Cabeçalho do dia */}
              <h3 className="mb-3 font-display text-lg text-foreground">{day}</h3>

              {/* Turnos */}
              <div className="grid gap-3 md:grid-cols-2">
                {TURNOS.map(({ turno, nome }) => {
                  const k = key(dia, turno);
                  const existing = getExisting(dia, turno);
                  const editing = !!forms[k];
                  const form = getForm(dia, turno);
                  const isSaving = saving === k;
                  const isRemoving = removing === k;

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
                            <span className={`text-[10px] ${existing.ativo ? "text-status-available" : "text-muted-foreground"}`}>
                              {existing.ativo
                                ? `${existing.horaAbertura} – ${existing.horaFechamento}`
                                : "Fechado"}
                            </span>
                          )}
                          {!existing && (
                            <span className="text-[10px] text-muted-foreground">Não configurado</span>
                          )}
                        </div>

                        {!editing && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs"
                            onClick={() => startEditing(dia, turno)}
                          >
                            {existing ? "Editar" : <><Plus className="h-3 w-3 mr-1" />Configurar</>}
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
                                onChange={(e) => setField(dia, turno, "horaAbertura", e.target.value)}
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
                                onChange={(e) => setField(dia, turno, "horaFechamento", e.target.value)}
                                disabled={isSaving || !form.ativo}
                                className="mt-0.5 h-8 text-sm"
                              />
                            </div>
                          </div>

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
                              {isSaving
                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                : <Save className="h-3 w-3" />}
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
                                {isRemoving
                                  ? <Loader2 className="h-3 w-3 animate-spin" />
                                  : <Trash2 className="h-3 w-3" />}
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
          ))}
        </div>
      )}
    </div>
  );
}
