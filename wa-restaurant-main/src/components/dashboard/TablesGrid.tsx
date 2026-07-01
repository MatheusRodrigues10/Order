import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type MesaInfo, type Reserva } from "@/lib/api";
import { TableCard } from "./TableCard";
import { TableActionsModal } from "./TableActionsModal";
import { RefreshCw } from "lucide-react";

interface TablesGridProps {
  selectedDate?: string;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toBrasiliaDate(isoUtc: string): string {
  const ms = new Date(isoUtc).getTime() - 3 * 60 * 60 * 1000;
  return new Date(ms).toISOString().slice(0, 10);
}

function buildFutureMesas(
  reservas: Reserva[],
  currentMesas: MesaInfo[],
  totalMesas: number,
  dateStr: string,
): MesaInfo[] {
  const dateReservations = reservas.filter(
    (r) => toBrasiliaDate(r.inicioReserva) === dateStr,
  );

  // Build group map: grupoReservaId → sorted mesa numbers
  const grupoMap = new Map<string, number[]>();
  for (const r of dateReservations) {
    if (r.grupoReservaId) {
      const arr = grupoMap.get(r.grupoReservaId) ?? [];
      if (!arr.includes(r.numeroMesa)) arr.push(r.numeroMesa);
      grupoMap.set(r.grupoReservaId, arr);
    }
  }

  // Earliest reservation per mesa
  const mesaMap = new Map<number, Reserva>();
  for (const r of [...dateReservations].sort((a, b) =>
    a.inicioReserva.localeCompare(b.inicioReserva),
  )) {
    if (!mesaMap.has(r.numeroMesa)) mesaMap.set(r.numeroMesa, r);
  }

  const blockedMesas = new Map(
    currentMesas.filter((m) => m.status === "blocked").map((m) => [m.numero, m]),
  );

  const result: MesaInfo[] = [];
  for (let num = 1; num <= totalMesas; num++) {
    const blocked = blockedMesas.get(num);
    if (blocked) {
      result.push(blocked);
      continue;
    }

    const r = mesaMap.get(num);
    if (r) {
      const mesasJuntadas = r.grupoReservaId
        ? (grupoMap.get(r.grupoReservaId) ?? [])
            .filter((m) => m !== num)
            .sort((a, b) => a - b)
        : [];
      result.push({
        numero: num,
        status: "reserved",
        reserva: {
          id: r.id,
          grupoReservaId: r.grupoReservaId,
          mesasJuntadas,
          quantidadePessoas: r.quantidadePessoas,
          nomeCliente: r.nomeCliente,
          telefone: r.telefone,
          inicioReserva: r.inicioReserva,
          fimReserva: r.fimReserva,
          fimLimpeza: r.fimLimpeza,
        },
        bloqueio: null,
      });
    } else {
      result.push({ numero: num, status: "available", reserva: null, bloqueio: null });
    }
  }

  return result;
}

export function TablesGrid({ selectedDate }: TablesGridProps) {
  const queryClient = useQueryClient();
  const today = todayStr();
  const isToday = !selectedDate || selectedDate === today;

  const { data: mesas = [], isLoading: mesasLoading } = useQuery<MesaInfo[]>({
    queryKey: ["tables"],
    queryFn: api.admin.listarMesas,
    refetchInterval: isToday ? 30_000 : false,
  });

  const { data: reservas = [], isLoading: reservasLoading } = useQuery<Reserva[]>({
    queryKey: ["reservations"],
    queryFn: api.admin.listarReservas,
    enabled: !isToday,
    staleTime: 30_000,
  });

  const { data: config } = useQuery({
    queryKey: ["config"],
    queryFn: api.admin.getConfig,
    staleTime: 60_000,
  });

  const lugaresPorMesa = config?.lugaresPorMesa ?? 4;
  const [selected, setSelected] = useState<MesaInfo | null>(null);

  const isLoading = isToday ? mesasLoading : mesasLoading || reservasLoading;

  const effectiveMesas = useMemo<MesaInfo[]>(() => {
    if (isToday) return mesas;
    return buildFutureMesas(reservas, mesas, config?.totalMesas ?? 70, selectedDate!);
  }, [isToday, mesas, reservas, config, selectedDate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
        Carregando mesas…
      </div>
    );
  }

  const allSorted = [...effectiveMesas].sort((a, b) => a.numero - b.numero);

  const activeMesas: MesaInfo[] = [];
  const blockedMesas: MesaInfo[] = [];
  const availableMesas: MesaInfo[] = [];
  for (const mesa of allSorted) {
    if (mesa.status === "reserved" || mesa.status === "occupied" || mesa.status === "cleaning") {
      activeMesas.push(mesa);
    } else if (mesa.status === "blocked") {
      blockedMesas.push(mesa);
    } else {
      availableMesas.push(mesa);
    }
  }

  // Group active mesas by grupoReservaId
  const groupedById = new Map<string, MesaInfo[]>();
  const soloActive: MesaInfo[] = [];
  for (const mesa of activeMesas) {
    const gid = mesa.reserva?.grupoReservaId;
    if (gid) {
      const arr = groupedById.get(gid) ?? [];
      arr.push(mesa);
      groupedById.set(gid, arr);
    } else {
      soloActive.push(mesa);
    }
  }

  // Grid: 2 cols mobile, 3 cols sm, 4 cols md, 7 cols lg
  // A group of N mesas occupies N columns, capped at the max cols per breakpoint.
  // Beyond 7 mesas → full row.
  function getSpanClass(span: number): string {
    if (span <= 1) return "col-span-1";
    if (span === 2) return "col-span-full sm:col-span-2 md:col-span-2 lg:col-span-2";
    if (span === 3) return "col-span-full sm:col-span-full md:col-span-3 lg:col-span-3";
    if (span === 4) return "col-span-full sm:col-span-full md:col-span-full lg:col-span-4";
    if (span === 5) return "col-span-full sm:col-span-full md:col-span-full lg:col-span-5";
    if (span === 6) return "col-span-full sm:col-span-full md:col-span-full lg:col-span-6";
    return "col-span-full"; // 7+
  }

  type GridEntry =
    | { type: "group"; mesas: MesaInfo[]; primary: MesaInfo }
    | { type: "single"; mesa: MesaInfo };

  const entries: GridEntry[] = [];

  const groups = [...groupedById.values()]
    .map((g) => g.sort((a, b) => a.numero - b.numero))
    .sort((a, b) => {
      const ta = a[0].reserva?.inicioReserva ?? "";
      const tb = b[0].reserva?.inicioReserva ?? "";
      return ta.localeCompare(tb);
    });

  for (const group of groups) {
    entries.push({ type: "group", mesas: group, primary: group[0] });
  }

  soloActive.sort((a, b) => {
    const ta = a.reserva?.inicioReserva ?? "";
    const tb = b.reserva?.inicioReserva ?? "";
    return ta.localeCompare(tb);
  });
  for (const mesa of soloActive) {
    entries.push({ type: "single", mesa });
  }

  const items: React.ReactElement[] = [];

  const addSectionSeparator = (key: string, label: string) => {
    items.push(
      <div key={key} className="col-span-full flex items-center gap-3 py-1">
        <div className="h-px flex-1 bg-border/40" />
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">
          {label}
        </span>
        <div className="h-px flex-1 bg-border/40" />
      </div>,
    );
  };

  for (const entry of entries) {
    if (entry.type === "group") {
      const mesasJuntadas = entry.primary.reserva?.mesasJuntadas ?? [];
      const span = 1 + mesasJuntadas.length;
      const spanClass = getSpanClass(span);
      items.push(
        <div key={`g-${entry.primary.numero}`} className={`${spanClass} flex min-h-0`}>
          <TableCard
            mesa={entry.primary}
            lugaresPorMesa={lugaresPorMesa}
            onClick={isToday ? setSelected : undefined}
          />
        </div>,
      );
    } else {
      items.push(
        <div key={entry.mesa.numero} className="flex min-h-0">
          <TableCard
            mesa={entry.mesa}
            lugaresPorMesa={lugaresPorMesa}
            onClick={isToday ? setSelected : undefined}
          />
        </div>,
      );
    }
  }

  if (availableMesas.length > 0) {
    addSectionSeparator("__sep-available", "Mesas livres");
    for (const mesa of availableMesas) {
      items.push(
        <div key={mesa.numero} className="flex min-h-0">
          <TableCard
            mesa={mesa}
            lugaresPorMesa={lugaresPorMesa}
            onClick={isToday ? setSelected : undefined}
          />
        </div>,
      );
    }
  }

  if (blockedMesas.length > 0) {
    addSectionSeparator("__sep-blocked", "Mesas bloqueadas");
    for (const mesa of blockedMesas) {
      items.push(
        <div key={mesa.numero} className="flex min-h-0">
          <TableCard
            mesa={mesa}
            lugaresPorMesa={lugaresPorMesa}
            onClick={isToday ? setSelected : undefined}
          />
        </div>,
      );
    }
  }

  return (
    <>
      <div
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-7"
        style={{ gridAutoRows: "minmax(100px, auto)" }}
      >
        {items}
      </div>

      {isToday && (
        <TableActionsModal
          mesa={selected}
          lugaresPorMesa={lugaresPorMesa}
          open={!!selected}
          onClose={() => setSelected(null)}
          onAction={() => {
            queryClient.invalidateQueries({ queryKey: ["tables"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard"] });
            queryClient.invalidateQueries({ queryKey: ["reservations"] });
            setSelected(null);
          }}
        />
      )}
    </>
  );
}
