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

  const sorted = [...mesas].sort((a, b) => a.numero - b.numero);

  const mesaToGroup = new Map<number, { all: number[]; primary: number }>();
  for (const mesa of sorted) {
    if (mesa.reserva?.grupoReservaId && mesa.reserva.mesasJuntadas?.length) {
      const all = [mesa.numero, ...mesa.reserva.mesasJuntadas].sort((a, b) => a - b);
      for (const n of all) mesaToGroup.set(n, { all, primary: all[0] });
    }
  }

  const secondarySet = new Set<number>();
  for (const [n, g] of mesaToGroup) {
    if (n !== g.primary) secondarySet.add(n);
  }

  const items: React.ReactElement[] = [];

  for (const mesa of sorted) {
    if (secondarySet.has(mesa.numero)) continue;

    const group = mesaToGroup.get(mesa.numero);

    if (group) {
      const span = group.all.length;
      items.push(
        <div
          key={mesa.numero}
          style={{ gridColumn: `span ${span}` }}
          className="flex min-h-0"
        >
          <TableCard mesa={mesa} lugaresPorMesa={lugaresPorMesa} onClick={setSelected} />
        </div>
      );
    } else {
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
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7"
        style={{ gridAutoRows: "minmax(90px, auto)" }}
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
