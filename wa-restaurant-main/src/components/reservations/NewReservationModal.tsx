import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { api, ApiError, type HorarioFuncionamento, type Config } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  prefillTableId?: number;
  onSuccess?: () => void;
  initialPeriod?: "lunch" | "dinner";
  initialDate?: string;
}

function getShiftWindow(
  dateStr: string,
  period: "lunch" | "dinner",
  horarios: HorarioFuncionamento[],
  config: Config | undefined
) {
  const dayOfWeek = new Date(dateStr + "T12:00:00").getDay();
  const turno = period === "lunch" ? 1 : 2;
  const shift = horarios.find((h) => h.diaSemana === dayOfWeek && h.turno === turno && h.ativo);

  if (shift) return { abertura: shift.horaAbertura, fechamento: shift.horaFechamento };
  if (period === "lunch") return { abertura: config?.horarioAbertura ?? "11:00", fechamento: "15:00" };
  return { abertura: "18:00", fechamento: config?.horarioFechamento ?? "23:00" };
}

function toMin(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function NewReservationModal({
  open,
  onClose,
  prefillTableId,
  onSuccess,
  initialPeriod,
  initialDate,
}: Props) {
  const queryClient = useQueryClient();

  const defaultPeriod = (): "lunch" | "dinner" =>
    initialPeriod ?? (new Date().getHours() < 15 ? "lunch" : "dinner");

  const [mesa, setMesa]        = useState<number | "">(prefillTableId ?? "");
  const [qtd, setQtd]          = useState(2);
  const [data, setData]        = useState(initialDate ?? new Date().toISOString().slice(0, 10));
  const [period, setPeriod]    = useState<"lunch" | "dinner">(defaultPeriod);
  const [hora, setHora]        = useState("");
  const [nomeCliente, setNome] = useState("");
  const [telefone, setTel]     = useState("");
  const [loading, setLoading]  = useState(false);

  const { data: config } = useQuery<Config>({
    queryKey: ["config"],
    queryFn: api.admin.getConfig,
    staleTime: 60_000,
  });

  const { data: horarios = [] } = useQuery<HorarioFuncionamento[]>({
    queryKey: ["horarios-funcionamento"],
    queryFn: api.admin.listarHorarios,
    staleTime: 300_000,
  });

  // Sync with parent props every time the modal opens
  useEffect(() => {
    if (!open) return;
    const d = initialDate ?? new Date().toISOString().slice(0, 10);
    const p = initialPeriod ?? (new Date().getHours() < 15 ? "lunch" : "dinner");
    setData(d);
    setPeriod(p);
    setMesa(prefillTableId ?? "");
    setQtd(2);
    setNome("");
    setTel("");
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const shiftWindow = useMemo(
    () => getShiftWindow(data, period, horarios, config),
    [data, period, horarios, config]
  );

  // Auto-update hora to shift start whenever the window changes (period or date swap)
  useEffect(() => {
    setHora(shiftWindow.abertura);
  }, [shiftWindow.abertura, shiftWindow.fechamento]);

  const lugaresPorMesa = config?.lugaresPorMesa ?? 4;
  const tablesNeeded = mesa !== "" ? Math.ceil(qtd / lugaresPorMesa) : 1;
  const mesasJuntadas =
    tablesNeeded > 1 && mesa !== ""
      ? Array.from({ length: tablesNeeded }, (_, i) => Number(mesa) + i)
      : [];

  const reset = () => {
    setMesa(prefillTableId ?? "");
    setQtd(2);
    const d = initialDate ?? new Date().toISOString().slice(0, 10);
    const p = initialPeriod ?? (new Date().getHours() < 15 ? "lunch" : "dinner");
    setData(d);
    setPeriod(p);
    setHora("");
    setNome("");
    setTel("");
  };

  const handleClose = () => { reset(); onClose(); };

  const submit = async () => {
    if (!mesa) { toast.error("Informe o número da mesa"); return; }
    if (!data) { toast.error("Informe a data"); return; }
    if (!hora) { toast.error("Informe o horário"); return; }
    if (qtd < 1) { toast.error("Informe a quantidade de pessoas"); return; }

    // Validate time within shift window
    const horaMin = toMin(hora);
    const aberturaMin = toMin(shiftWindow.abertura);
    const fechamentoMin = toMin(shiftWindow.fechamento);

    if (horaMin < aberturaMin) {
      toast.error(
        `O ${period === "lunch" ? "Almoço" : "Jantar"} começa às ${shiftWindow.abertura}`
      );
      return;
    }
    if (horaMin >= fechamentoMin) {
      toast.error(
        `O ${period === "lunch" ? "Almoço" : "Jantar"} encerra às ${shiftWindow.fechamento}`
      );
      return;
    }

    // Validate not in the past (for today)
    const today = new Date().toISOString().slice(0, 10);
    if (data === today) {
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      if (horaMin <= nowMin) {
        toast.error("Não é possível reservar em horário que já passou");
        return;
      }
    }

    setLoading(true);
    try {
      const result = await api.admin.criarReserva({
        mesa: Number(mesa),
        quantidadePessoas: qtd,
        data,
        hora,
        nomeCliente: nomeCliente.trim() || undefined,
        telefone: telefone.trim() || undefined,
      });

      const mesasLabel =
        result.mesas.length > 1
          ? `Mesas ${result.mesas.join(", ")}`
          : `Mesa ${result.mesas[0]}`;
      toast.success(`${mesasLabel} reservada${result.mesas.length > 1 ? "s" : ""} com sucesso!`);

      await queryClient.invalidateQueries({ queryKey: ["reservas"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["mesas"] });
      onSuccess?.();
      handleClose();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Erro ao criar reserva";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Nova reserva</DialogTitle>
          <DialogDescription>Preencha os dados para reservar uma mesa.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {/* Mesa + Pessoas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Número da mesa</Label>
              <Input
                type="number"
                min={1}
                max={999}
                value={mesa}
                onChange={(e) => setMesa(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="Ex.: 10"
              />
            </div>
            <div>
              <Label>Pessoas</Label>
              <Input
                type="number"
                min={1}
                max={999}
                value={qtd}
                onChange={(e) => setQtd(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Data + Turno */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data</Label>
              <Input
                type="date"
                value={data}
                min={today}
                onChange={(e) => setData(e.target.value)}
              />
            </div>
            <div>
              <Label>Turno</Label>
              <Tabs
                value={period}
                onValueChange={(v) => setPeriod(v as "lunch" | "dinner")}
                className="mt-1"
              >
                <TabsList className="w-full">
                  <TabsTrigger value="lunch" className="flex-1 text-xs">
                    Almoço
                  </TabsTrigger>
                  <TabsTrigger value="dinner" className="flex-1 text-xs">
                    Jantar
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Horário livre */}
          <div>
            <Label>Horário</Label>
            <Input
              type="time"
              value={hora}
              min={shiftWindow.abertura}
              max={shiftWindow.fechamento}
              onChange={(e) => setHora(e.target.value)}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              {period === "lunch" ? "Almoço" : "Jantar"}:{" "}
              {shiftWindow.abertura} – {shiftWindow.fechamento}
            </p>
          </div>

          {/* Nome e Telefone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>
                Nome do cliente{" "}
                <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                type="text"
                value={nomeCliente}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: João Silva"
              />
            </div>
            <div>
              <Label>
                Telefone <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                type="tel"
                value={telefone}
                onChange={(e) => setTel(e.target.value)}
                placeholder="Ex.: (11) 99999-9999"
              />
            </div>
          </div>

          {/* Aviso mesas unidas */}
          {mesasJuntadas.length > 1 && (
            <div className="flex items-start gap-2 rounded-md border border-gold/30 bg-gold/5 px-3 py-2.5 text-sm">
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              <div>
                <span className="font-medium text-foreground">
                  {tablesNeeded} mesas serão unidas
                </span>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Para {qtd} pessoas ({lugaresPorMesa} por mesa), as mesas{" "}
                  <span className="font-medium text-foreground">
                    {mesasJuntadas.join(", ")}
                  </span>{" "}
                  serão reservadas juntas.
                </p>
              </div>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground">
            A duração e tempo de limpeza são definidos nas configurações do sistema.
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={loading}>
            {loading ? "Reservando…" : "Confirmar reserva"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
