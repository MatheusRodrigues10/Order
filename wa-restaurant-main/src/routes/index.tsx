import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { TablesGrid } from "@/components/dashboard/TablesGrid";
import { StatusLegend } from "@/components/dashboard/StatusLegend";
import { UpcomingReservations } from "@/components/dashboard/UpcomingReservations";
import { NewReservationModal } from "@/components/reservations/NewReservationModal";

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

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-8 md:py-10">
      {/* Header */}
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.32em] text-gold">和 · Harmonia</p>
          <h1 className="mt-1 font-display text-4xl text-foreground md:text-5xl">Salão hoje</h1>
          <p className="mt-1 text-sm capitalize text-muted-foreground">
            {format(now, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" title="Data para nova reserva">
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
                    setSelectedDate(date);
                    setDatePickerOpen(false);
                  }
                }}
                disabled={(date) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return date < today;
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
      <section className="mt-8">
        <DashboardStats />
      </section>

      {/* Grid + Side */}
      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl text-foreground">Mesas</h2>
            <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Toque em uma mesa para gerenciar
            </span>
          </div>
          <StatusLegend />
          <TablesGrid />
        </div>
        <div className="space-y-4">
          <UpcomingReservations />
        </div>
      </section>

      <NewReservationModal
        open={openNew}
        onClose={() => setOpenNew(false)}
        initialDate={selectedDateStr}
      />
    </div>
  );
}
