import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type MesaInfo } from "@/lib/api";
import { TableCard } from "./TableCard";
import { TableActionsModal } from "./TableActionsModal";
import { RefreshCw } from "lucide-react";


export function TablesGrid() {
  const queryClient = useQueryClient();

  const { data: mesas = [], isLoading } = useQuery<MesaInfo[]>({
    queryKey: ["tables"],
    queryFn: api.admin.listarMesas,
    refetchInterval: 30_000,
  });

  const { data: config } = useQuery({
    queryKey: ["config"],
    queryFn: api.admin.getConfig,
    staleTime: 60_000,
  });

  const lugaresPorMesa = config?.lugaresPorMesa ?? 4;
  const [selected, setSelected] = useState<MesaInfo | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
        Carregando mesas…
      </div>
    );
  }

  const allSorted = [...mesas].sort((a, b) => a.numero - b.numero);

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

  // Build ordered list: grouped reservations first (by earliest start), then solo active, then inactive
  type GridEntry =
    | { type: "group"; mesas: MesaInfo[]; primary: MesaInfo }
    | { type: "single"; mesa: MesaInfo };

  const entries: GridEntry[] = [];

  // Multi-table groups sorted by reservation start time
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

  // Solo active mesas sorted by reservation start time
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
      const span = entry.mesas.length;
      const spanClass =
        span >= 4
          ? "col-span-full"
          : span === 3
            ? "col-span-2 sm:col-span-full md:col-span-3 lg:col-span-3"
            : "col-span-2 sm:col-span-2 md:col-span-2 lg:col-span-2";
      items.push(
        <div
          key={`g-${entry.primary.numero}`}
          className={`${spanClass} flex min-h-0`}
        >
          <TableCard mesa={entry.primary} lugaresPorMesa={lugaresPorMesa} onClick={setSelected} />
        </div>
      );
    } else {
      items.push(
        <div key={entry.mesa.numero} className="flex min-h-0">
          <TableCard mesa={entry.mesa} lugaresPorMesa={lugaresPorMesa} onClick={setSelected} />
        </div>
      );
    }
  }

  if (availableMesas.length > 0) {
    addSectionSeparator("__sep-available", "Mesas livres");
    for (const mesa of availableMesas) {
      items.push(
        <div key={mesa.numero} className="flex min-h-0">
          <TableCard mesa={mesa} lugaresPorMesa={lugaresPorMesa} onClick={setSelected} />
        </div>
      );
    }
  }

  if (blockedMesas.length > 0) {
    addSectionSeparator("__sep-blocked", "Mesas bloqueadas");
    for (const mesa of blockedMesas) {
      items.push(
        <div key={mesa.numero} className="flex min-h-0">
          <TableCard mesa={mesa} lugaresPorMesa={lugaresPorMesa} onClick={setSelected} />
        </div>
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
    </>
  );
}
