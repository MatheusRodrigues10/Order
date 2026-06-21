import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Reserva, ApiError } from "@/lib/api";
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
import { Trash2, RefreshCw } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/reservations")({
  head: () => ({
    meta: [{ title: "Reservas — WA Restaurant" }],
  }),
  component: ReservationsPage,
});

function formatHora(iso: string) {
  try {
    return format(parseISO(iso), "HH:mm", { locale: ptBR });
  } catch {
    return iso.slice(11, 16);
  }
}

function formatData(iso: string) {
  try {
    return format(parseISO(iso), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return iso.slice(0, 10);
  }
}

function ReservationsPage() {
  const queryClient = useQueryClient();
  const {
    data: reservas = [],
    isLoading,
    refetch,
  } = useQuery<Reserva[]>({
    queryKey: ["reservations"],
    queryFn: api.admin.listarReservas,
    refetchInterval: 30_000,
  });

  const [idToDelete, setIdToDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!idToDelete) return;
    setDeleting(true);
    try {
      await api.admin.cancelarReserva(idToDelete);
      toast.success("Reserva cancelada com sucesso");
      await queryClient.invalidateQueries({ queryKey: ["reservations"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["tables"] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao cancelar reserva");
    } finally {
      setDeleting(false);
      setIdToDelete(null);
    }
  };

  return (
    <>
      <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-8 md:py-10">
        <header className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.32em] text-gold">Lista completa</p>
            <h1 className="mt-1 font-display text-4xl text-foreground">Reservas</h1>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="text-muted-foreground transition-colors hover:text-foreground"
            title="Atualizar"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </header>

        {isLoading && <p className="text-sm text-muted-foreground">Carregando reservas…</p>}

        {/* MOBILE */}
        {!isLoading && (
          <div className="space-y-3 md:hidden">
            {reservas.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma reserva ativa.</p>
            )}
            {reservas.map((r) => (
              <div key={r.id} className="rounded-md border border-border/60 bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-medium text-foreground">
                      {r.nomeCliente ?? `Mesa ${r.numeroMesa}`}
                    </h3>
                    {r.telefone && <p className="text-sm text-muted-foreground">{r.telefone}</p>}
                  </div>
                  <span className="rounded-full border border-gold/30 px-2 py-0.5 text-[10px] uppercase tracking-wider text-gold">
                    Reservada
                  </span>
                </div>

                <div className="mt-3 space-y-1 text-sm">
                  <p>
                    <strong>Mesa:</strong> {r.numeroMesa}
                  </p>
                  <p>
                    <strong>Pessoas:</strong> {r.quantidadePessoas}
                  </p>
                  <p>
                    <strong>Data:</strong> {formatData(r.inicioReserva)}
                  </p>
                  <p>
                    <strong>Início:</strong> {formatHora(r.inicioReserva)}
                  </p>
                  <p>
                    <strong>Fim:</strong> {formatHora(r.fimReserva)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIdToDelete(r.id)}
                  className="mt-4 flex items-center gap-2 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                  Cancelar
                </button>
              </div>
            ))}
          </div>
        )}

        {/* TABLET + DESKTOP */}
        {!isLoading && (
          <div className="hidden md:block overflow-hidden rounded-md border border-border/60 bg-card">
            <div className="overflow-x-auto">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow className="border-border/60">
                    <TableHead>Mesa</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Pessoas</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Fim</TableHead>
                    <TableHead className="w-[80px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {reservas.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        Nenhuma reserva ativa.
                      </TableCell>
                    </TableRow>
                  )}
                  {reservas.map((r) => (
                    <TableRow key={r.id} className="border-border/60">
                      <TableCell className="font-medium">{r.numeroMesa}</TableCell>
                      <TableCell>{r.nomeCliente ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{r.telefone ?? "—"}</TableCell>
                      <TableCell>{r.quantidadePessoas}</TableCell>
                      <TableCell>{formatData(r.inicioReserva)}</TableCell>
                      <TableCell>{formatHora(r.inicioReserva)}</TableCell>
                      <TableCell>{formatHora(r.fimReserva)}</TableCell>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => setIdToDelete(r.id)}
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
        )}
      </div>

      <AlertDialog
        open={!!idToDelete}
        onOpenChange={(open) => {
          if (!open) setIdToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar reserva?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? "Cancelando…" : "Confirmar cancelamento"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
