import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, CheckCircle2, CircleSlash, Utensils } from "lucide-react";
import { cn } from "@/lib/utils";
import { api, type MesaInfo, type Reserva } from "@/lib/api";

interface Props {
  selectedDate?: string;
}

function toBrasiliaDate(isoUtc: string): string {
  const ms = new Date(isoUtc).getTime() - 3 * 60 * 60 * 1000;
  return new Date(ms).toISOString().slice(0, 10);
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function DashboardStats({ selectedDate }: Props) {
  const today = todayStr();
  const isToday = !selectedDate || selectedDate === today;

  const { data: dashboardData } = useQuery({
    queryKey: ["dashboard"],
    queryFn: api.admin.dashboard,
    refetchInterval: isToday ? 30_000 : false,
    enabled: isToday,
  });

  const { data: reservas = [] } = useQuery<Reserva[]>({
    queryKey: ["reservations"],
    queryFn: api.admin.listarReservas,
    enabled: !isToday,
    staleTime: 30_000,
  });

  const { data: mesas = [] } = useQuery<MesaInfo[]>({
    queryKey: ["tables"],
    queryFn: api.admin.listarMesas,
    enabled: !isToday,
    staleTime: 30_000,
  });

  const { data: config } = useQuery({
    queryKey: ["config"],
    queryFn: api.admin.getConfig,
    staleTime: 60_000,
    enabled: !isToday,
  });

  const futureStats = useMemo(() => {
    if (isToday || !config) return null;

    const totalMesas = config.totalMesas;

    const reservedNums = new Set<number>();
    for (const r of reservas) {
      if (toBrasiliaDate(r.inicioReserva) === selectedDate) {
        reservedNums.add(r.numeroMesa);
      }
    }

    const mesasBloqueadas = mesas.filter((m) => m.status === "blocked").length;
    const mesasReservadas = reservedNums.size;
    const mesasLivres = Math.max(0, totalMesas - mesasReservadas - mesasBloqueadas);

    return { totalMesas, mesasLivres, mesasReservadas, mesasBloqueadas };
  }, [isToday, reservas, mesas, config, selectedDate]);

  const data = isToday ? dashboardData : futureStats;

  const stats = [
    { label: "Total de mesas", value: data?.totalMesas ?? "—", icon: Utensils, tone: "text-foreground" },
    { label: "Disponíveis",    value: data?.mesasLivres ?? "—", icon: CheckCircle2, tone: "text-status-available" },
    { label: "Reservadas",     value: data?.mesasReservadas ?? "—", icon: CalendarClock, tone: "text-status-reserved" },
    { label: "Bloqueadas",     value: data?.mesasBloqueadas ?? "—", icon: CircleSlash, tone: "text-muted-foreground" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div
            key={s.label}
            className="group relative overflow-hidden rounded-md border border-border/60 bg-card p-3 transition-colors hover:border-gold/30 sm:p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                {s.label}
              </span>
              <Icon className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", s.tone)} />
            </div>
            <div className="mt-2 font-display text-2xl text-foreground sm:text-3xl">{s.value}</div>
          </div>
        );
      })}
    </div>
  );
}
