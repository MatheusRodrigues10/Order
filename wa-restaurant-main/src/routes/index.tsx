import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { format, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, ChevronDown, CalendarOff, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { TablesGrid } from "@/components/dashboard/TablesGrid";
import { StatusLegend } from "@/components/dashboard/StatusLegend";
import { UpcomingReservations } from "@/components/dashboard/UpcomingReservations";
import { NewReservationModal } from "@/components/reservations/NewReservationModal";
import { useQuery } from "@tanstack/react-query";
import { api, type EventDay, type HorarioFuncionamento } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — WA Restaurant" },
      { name: "description", content: "Controle de salão, mesas e reservas em tempo real." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const [openNew, setOpenNew] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return d;
  });
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const now = new Date();
  const selectedDateStr = selectedDate.toISOString().slice(0, 10);
  const viewingToday = isToday(selectedDate);

  const { data: eventDays = [] } = useQuery<EventDay[]>({
    queryKey: ["event-days"],
    queryFn: api.admin.listarEventDays,
    staleTime: 300_000,
  });

  const { data: horarios = [] } = useQuery<HorarioFuncionamento[]>({
    queryKey: ["operating-hours"],
    queryFn: api.admin.listarHorarios,
    staleTime: 300_000,
  });

  const eventDaySet = useMemo(() => new Set(eventDays.map((e) => e.data)), [eventDays]);

  const eventDayDates = useMemo(
    () =>
      eventDays.map((e) => {
        const [y, m, d] = e.data.split("-").map(Number);
        return new Date(y, m - 1, d);
      }),
    [eventDays],
  );

  const selectedIsEventDay = eventDaySet.has(selectedDateStr);
  const selectedEventDay = selectedIsEventDay
    ? eventDays.find((e) => e.data === selectedDateStr)
    : null;

  // Detect closed days — only applies to future dates (today shows real-time grid)
  const selectedDayOfWeek = new Date(selectedDateStr + "T12:00:00").getDay();
  const selectedHasLunch = horarios.some(
    (h) => h.diaSemana === selectedDayOfWeek && h.turno === 1 && h.ativo,
  );
  const selectedHasDinner = horarios.some(
    (h) => h.diaSemana === selectedDayOfWeek && h.turno === 2 && h.ativo,
  );
  const selectedIsClosed =
    !viewingToday &&
    !selectedIsEventDay &&
    horarios.length > 0 &&
    !selectedHasLunch &&
    !selectedHasDinner;

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-8 md:py-10">
      {/* Header */}
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.32em] text-gold">和 · Harmonia</p>
          <h1 className="mt-1 font-display text-3xl text-foreground md:text-4xl lg:text-5xl">
            {viewingToday ? "Salão hoje" : "Salão"}
          </h1>
          <p className="mt-1 text-sm capitalize text-muted-foreground">
            {viewingToday
              ? format(now, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })
              : format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={viewingToday ? "outline" : "default"}
                size="sm"
                title="Selecionar data"
              >
                {format(selectedDate, "dd MMM", { locale: ptBR })}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    date.setHours(12, 0, 0, 0);
                    const dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
                    if (eventDaySet.has(dateStr)) {
                      const ev = eventDays.find((e) => e.data === dateStr);
                      toast.warning(
                        ev?.motivo
                          ? `Dia de evento: ${ev.motivo}`
                          : "Este dia está reservado para evento — reservas bloqueadas",
                        { duration: 4000 },
                      );
                    }
                    setSelectedDate(date);
                    setDatePickerOpen(false);
                  }
                }}
                disabled={(date) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return date < today;
                }}
                modifiers={{ evento: eventDayDates }}
                modifiersStyles={{
                  evento: { color: "rgb(251 146 60)", fontWeight: 600 },
                }}
                components={{
                  DayButton: ({ day, modifiers, className, ...props }) => (
                    <CalendarDayButton
                      day={day}
                      modifiers={modifiers}
                      className={cn(
                        className,
                        modifiers.evento &&
                          !modifiers.selected &&
                          "after:absolute after:bottom-0.5 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-orange-400",
                      )}
                      {...props}
                    />
                  ),
                }}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>

          <Button onClick={() => setOpenNew(true)}>
            <Plus /> Nova reserva
          </Button>
        </div>
      </header>

      {/* Stats */}
      <section className="mt-5 md:mt-8">
        <DashboardStats selectedDate={selectedDateStr} />
      </section>

      {/* Grid + Reservas */}
      <section className="mt-5 space-y-4 md:mt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl text-foreground md:text-2xl">Mesas</h2>
          <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            {viewingToday ? "Toque para gerenciar" : "Reservas do dia"}
          </span>
        </div>

        {selectedIsEventDay ? (
          <div className="flex min-h-[160px] flex-col items-center justify-center gap-4 rounded-md border border-orange-500/20 bg-orange-500/5 px-6 py-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-orange-500/30 bg-orange-500/10">
              <CalendarOff className="h-7 w-7 text-orange-400" />
            </div>
            <div>
              <p className="text-base font-semibold text-orange-400">
                Dia de evento — reservas bloqueadas
              </p>
              {selectedEventDay?.motivo && (
                <p className="mt-1 text-sm text-muted-foreground">{selectedEventDay.motivo}</p>
              )}
            </div>
          </div>
        ) : selectedIsClosed ? (
          <div className="flex min-h-[160px] flex-col items-center justify-center gap-4 rounded-md border border-orange-500/20 bg-orange-500/5 px-6 py-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-orange-500/30 bg-orange-500/10">
              <Clock className="h-7 w-7 text-orange-400" />
            </div>
            <div>
              <p className="text-base font-semibold text-orange-400">Restaurante fechado</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Nenhum turno ativo para este dia da semana
              </p>
            </div>
          </div>
        ) : (
          <>
            <StatusLegend />
            <TablesGrid selectedDate={selectedDateStr} />
          </>
        )}

        <UpcomingReservations />
      </section>

      <NewReservationModal
        open={openNew}
        onClose={() => setOpenNew(false)}
        initialDate={selectedDateStr}
      />
    </div>
  );
}
