import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type EventDay, ApiError } from "@/lib/api";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, RefreshCw, Plus, CalendarOff } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/event-days")({
  head: () => ({
    meta: [{ title: "Eventos — WA Restaurant" }],
  }),
  component: EventDaysPage,
});

// ── Formulário de criação ────────────────────────────────────────────────────

interface CreateForm {
  data: string;
  nomeCliente: string;
  telefone: string;
  motivo: string;
}

const EMPTY_FORM: CreateForm = { data: "", nomeCliente: "", telefone: "", motivo: "" };

function formatTelefone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

// ── Page ────────────────────────────────────────────────────────────────────

function EventDaysPage() {
  const queryClient = useQueryClient();
  const {
    data: eventos = [],
    isLoading,
    refetch,
  } = useQuery<EventDay[]>({
    queryKey: ["event-days"],
    queryFn: api.admin.listarEventDays,
  });

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [dataToDelete, setDataToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const futuros = eventos.filter((e) => !e.passado);
  const passados = eventos.filter((e) => e.passado);

  const handleCreate = async () => {
    if (!form.data || !form.nomeCliente || !form.telefone) {
      toast.error("Preencha data, nome e telefone");
      return;
    }
    setSaving(true);
    try {
      await api.admin.criarEventDay({
        data: form.data,
        nomeCliente: form.nomeCliente,
        telefone: form.telefone,
        motivo: form.motivo || undefined,
      });
      toast.success("Evento registrado com sucesso");
      setShowCreate(false);
      setForm(EMPTY_FORM);
      await queryClient.invalidateQueries({ queryKey: ["event-days"] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao registrar evento");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!dataToDelete) return;
    setDeleting(true);
    try {
      await api.admin.removerEventDay(dataToDelete);
      toast.success("Evento removido");
      await queryClient.invalidateQueries({ queryKey: ["event-days"] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao remover evento");
    } finally {
      setDeleting(false);
      setDataToDelete(null);
    }
  };

  return (
    <>
      <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-8 md:py-10">
        {/* Header */}
        <header className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.32em] text-gold">Gestão</p>
            <h1 className="mt-1 font-display text-4xl text-foreground">Eventos</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => refetch()}
              className="text-muted-foreground transition-colors hover:text-foreground"
              title="Atualizar"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 rounded-md bg-gold px-4 py-2 text-sm font-medium text-black transition hover:bg-gold/90"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Reservar dia</span>
            </button>
          </div>
        </header>

        {isLoading && (
          <p className="text-sm text-muted-foreground">Carregando eventos…</p>
        )}

        {!isLoading && (
          <>
            {/* Próximos eventos */}
            <section>
              <p className="mb-3 text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                Próximos
              </p>

              {/* Mobile */}
              <div className="space-y-3 md:hidden">
                {futuros.length === 0 && (
                  <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                    <CalendarOff className="h-6 w-6 opacity-40" />
                    <p className="text-sm">Nenhum evento agendado.</p>
                  </div>
                )}
                {futuros.map((e) => (
                  <EventCard key={e.id} evento={e} onDelete={() => setDataToDelete(e.data)} />
                ))}
              </div>

              {/* Desktop */}
              <div className="hidden md:block">
                <EventTable
                  eventos={futuros}
                  empty="Nenhum evento agendado."
                  onDelete={(data) => setDataToDelete(data)}
                />
              </div>
            </section>

            {/* Histórico */}
            {passados.length > 0 && (
              <section className="mt-10">
                <p className="mb-3 text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                  Histórico
                </p>

                <div className="space-y-3 md:hidden">
                  {passados.map((e) => (
                    <EventCard key={e.id} evento={e} onDelete={() => setDataToDelete(e.data)} passado />
                  ))}
                </div>

                <div className="hidden md:block">
                  <EventTable
                    eventos={passados}
                    empty=""
                    onDelete={(data) => setDataToDelete(data)}
                    passado
                  />
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* Modal de criação */}
      <Dialog open={showCreate} onOpenChange={(o) => { if (!o) { setShowCreate(false); setForm(EMPTY_FORM); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Reservar dia para evento</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="ev-data">Data</Label>
              <Input
                id="ev-data"
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                value={form.data}
                onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-nome">Nome do cliente / responsável</Label>
              <Input
                id="ev-nome"
                placeholder="ex: João Silva"
                value={form.nomeCliente}
                onChange={(e) => setForm((f) => ({ ...f, nomeCliente: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-tel">Telefone</Label>
              <Input
                id="ev-tel"
                placeholder="(11) 99999-9999"
                value={form.telefone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, telefone: formatTelefone(e.target.value) }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-motivo">
                Motivo <span className="text-xs text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="ev-motivo"
                placeholder="ex: Confraternização empresa X"
                value={form.motivo}
                onChange={(e) => setForm((f) => ({ ...f, motivo: e.target.value }))}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowCreate(false); setForm(EMPTY_FORM); }}
                className="rounded-md px-4 py-2 text-sm text-muted-foreground transition hover:text-foreground"
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={saving}
                className="rounded-md bg-gold px-4 py-2 text-sm font-medium text-black transition hover:bg-gold/90 disabled:opacity-60"
              >
                {saving ? "Salvando…" : "Confirmar"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmação de remoção */}
      <AlertDialog open={!!dataToDelete} onOpenChange={(o) => { if (!o) setDataToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover evento?</AlertDialogTitle>
            <AlertDialogDescription>
              O dia ficará disponível para reservas normais novamente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? "Removendo…" : "Confirmar remoção"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── Sub-componentes ──────────────────────────────────────────────────────────

function EventCard({
  evento,
  onDelete,
  passado = false,
}: {
  evento: EventDay;
  onDelete: () => void;
  passado?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-md border border-border/60 bg-card p-4",
      passado && "opacity-60"
    )}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-foreground">{evento.dataExtenso}</p>
          <p className="text-xs text-muted-foreground">{evento.nomeCliente} · {evento.telefone}</p>
        </div>
        {passado ? (
          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            Realizado
          </span>
        ) : (
          <span className="rounded-full border border-gold/30 px-2 py-0.5 text-[10px] uppercase tracking-wider text-gold">
            Agendado
          </span>
        )}
      </div>
      {evento.motivo && (
        <p className="mt-2 text-sm text-muted-foreground">{evento.motivo}</p>
      )}
      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Registrado em {evento.criadoEm}</p>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-md p-2 text-red-400 transition hover:bg-red-500/10"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function EventTable({
  eventos,
  empty,
  onDelete,
  passado = false,
}: {
  eventos: EventDay[];
  empty: string;
  onDelete: (data: string) => void;
  passado?: boolean;
}) {
  return (
    <div className={cn(
      "overflow-hidden rounded-md border border-border/60 bg-card",
      passado && "opacity-60"
    )}>
      <div className="overflow-x-auto">
        <Table className="min-w-[700px]">
          <TableHeader>
            <TableRow className="border-border/60">
              <TableHead>Data</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Registrado em</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {eventos.length === 0 && empty && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  {empty}
                </TableCell>
              </TableRow>
            )}
            {eventos.map((e) => (
              <TableRow key={e.id} className="border-border/60">
                <TableCell>
                  <p className="font-medium text-foreground">{e.dataFormatada}</p>
                  <p className="text-xs text-muted-foreground">{e.diaSemanaNome}</p>
                </TableCell>
                <TableCell>{e.nomeCliente}</TableCell>
                <TableCell className="text-muted-foreground">{e.telefone}</TableCell>
                <TableCell className="text-muted-foreground">{e.motivo ?? "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{e.criadoEm}</TableCell>
                <TableCell>
                  <button
                    type="button"
                    onClick={() => onDelete(e.data)}
                    className="rounded-md p-2 text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
