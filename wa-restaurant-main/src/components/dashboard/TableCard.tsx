import { cn } from "@/lib/utils";
import type { MesaInfo, MesaStatus } from "@/lib/api";
import { format, parseISO } from "date-fns";
import { Link } from "lucide-react";

const STATUS_LABELS: Record<MesaStatus, string> = {
  available: "Disponível",
  reserved: "Reservada",
  occupied: "Ocupada",
  blocked: "Bloqueada",
  cleaning: "Em limpeza",
};

const STATUS_RING: Record<MesaStatus, string> = {
  available: "border-l-status-available",
  reserved: "border-l-status-reserved",
  occupied: "border-l-status-occupied",
  blocked: "border-l-status-blocked",
  cleaning: "border-l-status-cleaning",
};

const STATUS_DOT: Record<MesaStatus, string> = {
  available: "bg-status-available",
  reserved: "bg-status-reserved",
  occupied: "bg-status-occupied",
  blocked: "bg-status-blocked",
  cleaning: "bg-status-cleaning",
};

interface TableCardProps {
  mesa: MesaInfo;
  lugaresPorMesa?: number;
  onClick?: (m: MesaInfo) => void;
}

function formatHora(iso: string) {
  try {
    return format(parseISO(iso), "HH:mm");
  } catch {
    return iso.slice(11, 16);
  }
}

export function TableCard({ mesa, lugaresPorMesa = 4, onClick }: TableCardProps) {
  const mesasJuntadas = mesa.reserva?.mesasJuntadas ?? [];
  const isGrouped = mesasJuntadas.length > 0;
  const allMesaNums = isGrouped
    ? [mesa.numero, ...mesasJuntadas].sort((a, b) => a - b)
    : [mesa.numero];
  const totalLugares = lugaresPorMesa * allMesaNums.length;

  return (
    <button
      type="button"
      onClick={() => onClick?.(mesa)}
      className={cn(
        "group relative flex h-full w-full overflow-hidden rounded-md border border-border/60 border-l-4 bg-card transition-all",
        isGrouped
          ? "flex-col items-center justify-center gap-1 px-3 py-3 text-center"
          : "flex-col gap-2 px-3 py-3 text-left",
        "hover:-translate-y-0.5 hover:border-gold/40 hover:shadow-[var(--shadow-card)]",
        "focus:outline-none focus:ring-2 focus:ring-gold/40",
        STATUS_RING[mesa.status],
      )}
    >
      {isGrouped ? (
        <>
          {/* Dot absolute so it doesn't affect centering */}
          <span
            className={cn("absolute right-2 top-2 h-2 w-2 shrink-0 rounded-full", STATUS_DOT[mesa.status])}
            aria-label={STATUS_LABELS[mesa.status]}
          />

          <div className="font-display text-xl leading-none text-foreground">
            {`Mesa ${allMesaNums.join(" · ")}`}
          </div>

          <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <Link className="h-2.5 w-2.5 shrink-0" />
            {`${totalLugares} lugares (${allMesaNums.length} mesas)`}
          </div>

          {(mesa.status === "reserved" || mesa.status === "occupied") && mesa.reserva && (
            <div className="mt-1 space-y-0.5">
              {mesa.reserva.nomeCliente && (
                <p className="line-clamp-1 text-xs font-medium text-foreground">
                  {mesa.reserva.nomeCliente}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                {mesa.reserva.quantidadePessoas} pessoa
                {mesa.reserva.quantidadePessoas !== 1 ? "s" : ""} ·{" "}
                {formatHora(mesa.reserva.inicioReserva)}
              </p>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-display text-xl leading-none text-foreground">
                Mesa {mesa.numero}
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {lugaresPorMesa} lugares
              </div>
            </div>
            <span
              className={cn("mt-0.5 h-2 w-2 shrink-0 rounded-full", STATUS_DOT[mesa.status])}
              aria-label={STATUS_LABELS[mesa.status]}
            />
          </div>

          <div className="mt-auto">
            {mesa.status === "available" && (
              <p className="text-xs text-status-available/90">Disponível</p>
            )}
            {mesa.status === "blocked" && (
              <p className="line-clamp-1 text-xs text-muted-foreground">
                {mesa.bloqueio?.motivo ?? "Bloqueada"}
              </p>
            )}
            {mesa.status === "cleaning" && (
              <p className="text-xs text-status-cleaning/90">Em limpeza</p>
            )}
            {(mesa.status === "reserved" || mesa.status === "occupied") && mesa.reserva && (
              <div className="space-y-0.5">
                {mesa.reserva.nomeCliente && (
                  <p className="line-clamp-1 text-xs font-medium text-foreground">
                    {mesa.reserva.nomeCliente}
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground">
                  {mesa.reserva.quantidadePessoas} pessoa
                  {mesa.reserva.quantidadePessoas !== 1 ? "s" : ""} ·{" "}
                  {formatHora(mesa.reserva.inicioReserva)}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </button>
  );
}
