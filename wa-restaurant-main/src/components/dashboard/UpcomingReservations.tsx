import { useQuery } from "@tanstack/react-query";
import { Clock, Users, RefreshCw } from "lucide-react";
import { api, type Reserva } from "@/lib/api";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatHora(iso: string) {
  try {
    return format(parseISO(iso), "HH:mm", { locale: ptBR });
  } catch {
    return iso.slice(11, 16);
  }
}

export function UpcomingReservations() {
  const { data: reservas = [], isLoading, refetch } = useQuery<Reserva[]>({
    queryKey: ["reservas"],
    queryFn: api.admin.listarReservas,
    refetchInterval: 30_000,
  });

  const upcoming = reservas
    .filter((r) => new Date(r.fimLimpeza) > new Date())
    .slice(0, 10);

  return (
    <div className="rounded-md border border-border/60 bg-card">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <h3 className="font-display text-lg text-foreground">Próximas reservas</h3>
        <button
          onClick={() => refetch()}
          className="text-muted-foreground transition-colors hover:text-foreground"
          title="Atualizar"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>
      <ul className="divide-y divide-border/60">
        {isLoading && (
          <li className="px-4 py-6 text-sm text-muted-foreground">Carregando…</li>
        )}
        {!isLoading && upcoming.length === 0 && (
          <li className="px-4 py-6 text-sm text-muted-foreground">
            Nenhuma reserva próxima.
          </li>
        )}
        {upcoming.map((r) => (
          <li key={r.id} className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-10 w-12 flex-col items-center justify-center rounded-sm bg-background/60 text-gold">
              <Clock className="h-3 w-3" />
              <span className="text-xs font-medium">{formatHora(r.inicioReserva)}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {r.nomeCliente ?? `Mesa ${r.numeroMesa}`}
              </p>
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                Mesa {r.numeroMesa} · {r.quantidadePessoas} pess.
              </p>
            </div>
            <span className="rounded-full border border-gold/30 px-2 py-0.5 text-[10px] uppercase tracking-wider text-gold">
              Reservada
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
