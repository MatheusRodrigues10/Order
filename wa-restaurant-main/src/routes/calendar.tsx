import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Reserva, type HorarioFuncionamento, ApiError } from "@/lib/api";
import { toast } from "sonner";
import { Clock, Users, Trash2, RefreshCw } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [{ title: "Agenda — WA Restaurant" }],
  }),
  component: CalendarPage,
});

function formatHora(iso: string) {
  try {
    return format(parseISO(iso), "HH:mm", { locale: ptBR });
  } catch {
    return iso.slice(11, 16);
  }
}

function todayStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function CalendarPage() {
  const queryClient = useQueryClient();
  const {
    data: reservas = [],
    isLoading,
    refetch,
  } = useQuery<Reserva[]>({
    queryKey: ["reservations"],
    queryFn: api.admin.listarReservas,
    refetchInterval: 30_000,
  });

  const { data: horarios = [] } = useQuery<HorarioFuncionamento[]>({
    queryKey: ["operating-hours"],
    queryFn: api.admin.listarHorarios,
    staleTime: 60_000,
  });

  const [idToDelete, setIdToDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const hoje = todayStr();

  const sorted = useMemo(
    () =>
      [...reservas]
        .filter((r) => r.inicioReserva.startsWith(hoje) || formatHora(r.inicioReserva) >= "00:00" && r.fimReserva.startsWith(hoje))
        .filter((r) => {
          const d = parseISO(r.inicioReserva);
          const rDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          return rDate === hoje;
        })
        .sort((a, b) => a.inicioReserva.localeCompare(b.inicioReserva)),
    [reservas, hoje],
  );

  const hours = useMemo(() => {
    const diaSemana = new Date().getDay();
    const turnosDoDia = horarios.filter(
      (h) => h.diaSemana === diaSemana && h.ativo,
    );

    if (turnosDoDia.length > 0) {
      const minH = Math.min(...turnosDoDia.map((t) => parseInt(t.horaAbertura.split(":")[0], 10)));
      const maxH = Math.max(...turnosDoDia.map((t) => parseInt(t.horaFechamento.split(":")[0], 10)));
      const count = maxH - minH + 1;
      return Array.from({ length: count }, (_, i) => String(i + minH).padStart(2, "0"));
    }

    return Array.from({ length: 12 }, (_, i) => String(i + 11).padStart(2, "0"));
  }, [horarios]);

  const handleDelete = async () => {
    if (!idToDelete) return;
    setDeleting(true);
    try {
      await api.admin.cancelarReserva(idToDelete);
      toast.success("Reserva cancelada com sucesso");
      await queryClient.invalidateQueries({ queryKey: ["reservations"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["tables"] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao cancelar reserva");
    } finally {
      setDeleting(false);
      setIdToDelete(null);
    }
  };

  return (
    <>
      <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-8 md:py-10">
        <header className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.32em] text-gold">Linha do tempo</p>
            <h1 className="mt-1 font-display text-3xl md:text-4xl text-foreground">
              Agenda do dia
            </h1>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="text-muted-foreground transition-colors hover:text-foreground"
            title="Atualizar"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </header>

        {isLoading && <p className="text-sm text-muted-foreground">Carregando agenda…</p>}

        {!isLoading && (
          <div className="rounded-md border border-border/60 bg-card">
            {hours.map((h, idx) => {
              const slot = sorted.filter((r) => formatHora(r.inicioReserva).startsWith(h));

              return (
                <div
                  key={h}
                  className={`grid grid-cols-[60px_1fr] gap-3 px-3 py-4 sm:grid-cols-[80px_1fr] sm:gap-4 sm:px-4 ${
                    idx ? "border-t border-border/60" : ""
                  }`}
                >
                  <div className="font-display text-lg text-gold">{h}:00</div>

                  <div className="space-y-2">
                    {slot.length === 0 && (
                      <p className="text-xs text-muted-foreground">Disponível</p>
                    )}

                    {slot.map((r) => (
                      <div
                        key={r.id}
                        className="flex flex-wrap items-center gap-2 rounded-md border border-gold/20 bg-background/40 px-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-foreground">
                            {r.nomeCliente ?? `Mesa ${r.numeroMesa}`}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Users className="h-3 w-3 shrink-0" />
                            {r.quantidadePessoas} pessoa{r.quantidadePessoas !== 1 ? "s" : ""}
                            <span>· Mesa {r.numeroMesa}</span>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <div className="flex items-center gap-1 text-xs text-foreground">
                            <Clock className="h-3 w-3 shrink-0 text-gold" />
                            <span className="whitespace-nowrap">
                              {formatHora(r.inicioReserva)} – {formatHora(r.fimReserva)}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => setIdToDelete(r.id)}
                            className="rounded-md p-1.5 text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
                            title="Cancelar reserva"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog
        open={!!idToDelete}
        onOpenChange={(open) => {
          if (!open) setIdToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar reserva?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? "Cancelando…" : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
