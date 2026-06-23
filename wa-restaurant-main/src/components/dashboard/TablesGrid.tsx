import { useState } from "react";
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

  // Build the set of secondary mesas (skipped — visually merged into the primary card)
  const secondaryMesas = new Set<number>();
  for (const mesa of mesas) {
    if (mesa.reserva?.mesasJuntadas && mesa.reserva.mesasJuntadas.length > 0) {
      const all = [mesa.numero, ...mesa.reserva.mesasJuntadas].sort((a, b) => a - b);
      all.slice(1).forEach((n) => secondaryMesas.add(n));
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
        Carregando mesas…
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
        {mesas.map((mesa) => {
          if (secondaryMesas.has(mesa.numero)) return null;

          const mesasJuntadas = mesa.reserva?.mesasJuntadas ?? [];
          const span = mesasJuntadas.length > 0 ? mesasJuntadas.length + 1 : 1;

          return (
            <div
              key={mesa.numero}
              style={span > 1 ? { gridColumn: `span ${span}` } : undefined}
              className="flex"
            >
              <TableCard mesa={mesa} lugaresPorMesa={lugaresPorMesa} onClick={setSelected} />
            </div>
          );
        })}
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
