import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MesaInfo, MesaStatus } from "@/lib/api";
import { api, ApiError } from "@/lib/api";
import { useState } from "react";
import { toast } from "sonner";
import { NewReservationModal } from "@/components/reservations/NewReservationModal";
import { Lock, Unlock, X, Plus, Loader2, Link } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  mesa: MesaInfo | null;
  lugaresPorMesa?: number;
  open: boolean;
  onClose: () => void;
  onAction: () => void;
}

const STATUS_LABEL: Record<MesaStatus, string> = {
  available: "Disponível",
  reserved: "Reservada",
  occupied: "Ocupada",
  blocked: "Bloqueada",
  cleaning: "Em limpeza",
};

function formatHora(iso: string) {
  try {
    return format(parseISO(iso), "HH:mm", { locale: ptBR });
  } catch {
    return iso.slice(11, 16);
  }
}

export function TableActionsModal({ mesa, lugaresPorMesa = 4, open, onClose, onAction }: Props) {
  const [openNew, setOpenNew] = useState(false);
  const [loading, setLoading] = useState(false);

  const [motivoBloquear, setMotivoBloquear] = useState("");
  const [showBloquearForm, setShowBloquearForm] = useState(false);

  if (!mesa) return null;

  const mesasJuntadas = mesa.reserva?.mesasJuntadas ?? [];
  const isGrouped = mesasJuntadas.length > 0;
  const totalLugares = lugaresPorMesa * (mesasJuntadas.length + 1);

  const handleClose = () => {
    setShowBloquearForm(false);
    setMotivoBloquear("");
    onClose();
  };

  const handleAction = () => {
    setShowBloquearForm(false);
    setMotivoBloquear("");
    onAction();
  };

  const handleBloquear = async () => {
    setLoading(true);
    try {
      await api.admin.bloquearMesa(mesa.numero, "Administrador", motivoBloquear || undefined);
      toast.success(`Mesa ${mesa.numero} bloqueada com sucesso`);
      handleAction();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao bloquear mesa");
    } finally {
      setLoading(false);
    }
  };

  const handleDesbloquear = async () => {
    setLoading(true);
    try {
      await api.admin.desbloquearMesa(mesa.numero);
      toast.success(`Mesa ${mesa.numero} desbloqueada`);
      handleAction();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao desbloquear mesa");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelarReserva = async () => {
    if (!mesa.reserva) return;
    setLoading(true);
    try {
      await api.admin.cancelarReserva(mesa.reserva.id);
      if (isGrouped) {
        const todasMesas = [mesa.numero, ...mesasJuntadas].sort((a, b) => a - b);
        toast.success(`Reserva das mesas ${todasMesas.join(", ")} cancelada`);
      } else {
        toast.success(`Reserva da mesa ${mesa.numero} cancelada`);
      }
      handleAction();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao cancelar reserva");
    } finally {
      setLoading(false);
    }
  };

  const descricaoCapacidade = isGrouped
    ? `${totalLugares} lugares (${mesasJuntadas.length + 1} mesas unidas)`
    : `${lugaresPorMesa} lugares`;

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              Mesa {mesa.numero}
              {isGrouped && (
                <span className="ml-2 inline-flex items-center gap-1 text-base font-normal text-gold">
                  <Link className="h-3.5 w-3.5" />
                  {[mesa.numero, ...mesasJuntadas].sort((a, b) => a - b).join(", ")}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              {descricaoCapacidade} · {STATUS_LABEL[mesa.status]}
            </DialogDescription>
          </DialogHeader>

          {mesa.status === "blocked" && mesa.bloqueio && (
            <div className="rounded-md border border-border/60 bg-background/40 p-3 text-sm text-muted-foreground">
              <span className="text-foreground">Motivo:</span>{" "}
              {mesa.bloqueio.motivo ?? "Sem motivo informado"}
              <div className="mt-1 text-[11px]">
                Bloqueada por <span className="text-foreground">{mesa.bloqueio.bloqueadaPor}</span>{" "}
                em {mesa.bloqueio.bloqueadaEm}
              </div>
            </div>
          )}

          {mesa.reserva && (
            <div className="rounded-md border border-border/60 bg-background/40 p-3 text-sm">
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                {mesa.status === "occupied" ? "Em andamento" : mesa.status === "cleaning" ? "Em limpeza" : "Próxima reserva"}
              </div>
              {mesa.reserva.nomeCliente && (
                <div className="mt-1 font-medium text-foreground">{mesa.reserva.nomeCliente}</div>
              )}
              <div className="mt-0.5 text-foreground">
                {mesa.reserva.quantidadePessoas} pessoa{mesa.reserva.quantidadePessoas !== 1 ? "s" : ""}
                {mesa.reserva.telefone && <span className="ml-2 text-muted-foreground">· {mesa.reserva.telefone}</span>}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatHora(mesa.reserva.inicioReserva)} – {formatHora(mesa.reserva.fimReserva)}
                {" · "}limpeza até {formatHora(mesa.reserva.fimLimpeza)}
              </div>
              {isGrouped && (
                <div className="mt-1.5 flex items-center gap-1 text-[11px] text-gold/80">
                  <Link className="h-3 w-3" />
                  Reserva ocupa as mesas {[mesa.numero, ...mesasJuntadas].sort((a, b) => a - b).join(", ")}
                </div>
              )}
            </div>
          )}

          {showBloquearForm && (
            <div className="space-y-2">
              <Label>Motivo do bloqueio (opcional)</Label>
              <Input
                placeholder="Ex.: Manutenção, evento especial…"
                value={motivoBloquear}
                onChange={(e) => setMotivoBloquear(e.target.value)}
                disabled={loading}
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-2">
            {mesa.status === "available" && !showBloquearForm && (
              <>
                <Button variant="default" onClick={() => setOpenNew(true)} disabled={loading}>
                  <Plus /> Fazer reserva
                </Button>
                <Button variant="outline" onClick={() => setShowBloquearForm(true)} disabled={loading}>
                  <Lock /> Bloquear mesa
                </Button>
              </>
            )}

            {mesa.status === "available" && showBloquearForm && (
              <>
                <Button onClick={handleBloquear} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock />}
                  Confirmar bloqueio
                </Button>
                <Button variant="ghost" onClick={() => { setShowBloquearForm(false); setMotivoBloquear(""); }} disabled={loading}>
                  Cancelar
                </Button>
              </>
            )}

            {(mesa.status === "reserved" || mesa.status === "occupied") && (
              <>
                <Button variant="outline" onClick={() => setOpenNew(true)} disabled={loading}>
                  <Plus /> Criar reserva futura
                </Button>
                <Button variant="ghost" className="text-destructive" onClick={handleCancelarReserva} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <X />}
                  {isGrouped ? `Cancelar reserva (${mesasJuntadas.length + 1} mesas)` : "Cancelar reserva atual"}
                </Button>
              </>
            )}

            {mesa.status === "cleaning" && mesa.reserva && (
              <Button variant="ghost" className="text-destructive" onClick={handleCancelarReserva} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <X />}
                Encerrar limpeza (cancelar reserva)
              </Button>
            )}

            {mesa.status === "blocked" && (
              <Button variant="default" onClick={handleDesbloquear} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlock />}
                Desbloquear mesa
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <NewReservationModal
        open={openNew}
        onClose={() => setOpenNew(false)}
        prefillTableId={mesa.numero}
        onSuccess={handleAction}
      />
    </>
  );
}
