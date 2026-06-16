import { useQuery } from "@tanstack/react-query";
import { CalendarClock, CheckCircle2, CircleSlash, Utensils } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

export function DashboardStats() {
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: api.admin.dashboard,
    refetchInterval: 30_000,
  });

  const stats = [
    { label: "Total de mesas",  value: data?.totalMesas ?? "—",      icon: Utensils,     tone: "text-foreground" },
    { label: "Disponíveis",      value: data?.mesasLivres ?? "—",     icon: CheckCircle2, tone: "text-status-available" },
    { label: "Reservadas",       value: data?.mesasReservadas ?? "—", icon: CalendarClock, tone: "text-status-reserved" },
    { label: "Bloqueadas",       value: data?.mesasBloqueadas ?? "—",  icon: CircleSlash,  tone: "text-muted-foreground" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div
            key={s.label}
            className="group relative overflow-hidden rounded-md border border-border/60 bg-card p-4 transition-colors hover:border-gold/30"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                {s.label}
              </span>
              <Icon className={cn("h-4 w-4", s.tone)} />
            </div>
            <div className="mt-2 font-display text-3xl text-foreground">{s.value}</div>
          </div>
        );
      })}
    </div>
  );
}
