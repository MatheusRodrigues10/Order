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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { api, ApiError, type HorarioFuncionamento, type Config } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";

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
  config: Config | undefined,
) {
  const dayOfWeek = new Date(dateStr + "T12:00:00").getDay();
  const turno = period === "lunch" ? 1 : 2;
  const shift = horarios.find((h) => h.diaSemana === dayOfWeek && h.turno === turno && h.ativo);

  if (shift) return { abertura: shift.horaAbertura, fechamento: shift.horaFechamento };
  if (period === "lunch")
    return { abertura: config?.horarioAbertura ?? "11:00", fechamento: "15:00" };
  return { abertura: "18:00", fechamento: config?.horarioFechamento ?? "23:00" };
}

function toMin(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function minToHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatDuracao(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

function generateSlots(abertura: string, fechamento: string, duracaoMin: number, limpezaMin = 0): string[] {
  const slots: string[] = [];
  const abMin = toMin(abertura);
  const fchMin = toMin(fechamento);
  const lastStart = fchMin - duracaoMin - limpezaMin;
  let cur = abMin;
  while (cur <= lastStart) {
    slots.push(minToHHMM(cur));
    cur += 30;
  }
  return slots;
}

function getNowHHMM(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function maskTelefone(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (!d) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
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

  const [mesa, setMesa] = useState<number | "">(prefillTableId ?? "");
  const [qtd, setQtd] = useState(2);
  const [data, setData] = useState(initialDate ?? new Date().toISOString().slice(0, 10));
  const [period, setPeriod] = useState<"lunch" | "dinner">(defaultPeriod);
  const [hora, setHora] = useState("");
  const [duracao, setDuracao] = useState(0);
  const [nomeCliente, setNome] = useState("");
  const [telefone, setTel] = useState("");
  const [loading, setLoading] = useState(false);
  const [agoraMode, setAgoraMode] = useState(false);
  const [tempoRestante, setTempoRestante] = useState("");

  const { data: config } = useQuery<Config>({
    queryKey: ["config"],
    queryFn: api.admin.getConfig,
    staleTime: 60_000,
  });

  const { data: horarios = [] } = useQuery<HorarioFuncionamento[]>({
    queryKey: ["operating-hours"],
    queryFn: api.admin.listarHorarios,
    staleTime: 300_000,
  });

  const maxDuracaoMin = config?.duracaoReservaMinutos ?? 120;

  // Opções de duração: 30, 60, 90, ... até maxDuracaoMin
  const duracaoOptions = useMemo(() => {
    const opts: number[] = [];
    for (let m = 30; m <= maxDuracaoMin; m += 30) opts.push(m);
    return opts;
  }, [maxDuracaoMin]);

  // Duração ativa: usa estado ou cai no máximo configurado
  const duracaoAtiva = duracao > 0 ? duracao : maxDuracaoMin;

  useEffect(() => {
    if (!open) return;
    const d = initialDate ?? new Date().toISOString().slice(0, 10);
    const p = initialPeriod ?? (new Date().getHours() < 15 ? "lunch" : "dinner");
    setData(d);
    setPeriod(p);
    setMesa(prefillTableId ?? "");
    setQtd(2);
    setDuracao(maxDuracaoMin);
    setNome("");
    setTel("");
    setAgoraMode(false);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Inicializa duração quando config carrega pela primeira vez
  useEffect(() => {
    if (config && duracao === 0) setDuracao(config.duracaoReservaMinutos);
  }, [config]); // eslint-disable-line react-hooks/exhaustive-deps

  // Garante que duração não ultrapasse o novo máximo se config mudar
  useEffect(() => {
    if (duracao > maxDuracaoMin) setDuracao(maxDuracaoMin);
  }, [maxDuracaoMin]); // eslint-disable-line react-hooks/exhaustive-deps

  const shiftWindow = useMemo(
    () => getShiftWindow(data, period, horarios, config),
    [data, period, horarios, config],
  );

  const slots = useMemo(() => {
    const limpeza = config?.tempoLimpezaMinutos ?? 0;
    const all = generateSlots(shiftWindow.abertura, shiftWindow.fechamento, duracaoAtiva, limpeza);
    const todayStr = new Date().toISOString().slice(0, 10);
    if (data !== todayStr) return all;
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    return all.filter((s) => toMin(s) > nowMin);
  }, [shiftWindow, duracaoAtiva, data, config]);

  // Quando slots mudam (período, data ou duração), reseta o horário para o primeiro slot
  useEffect(() => {
    if (!agoraMode) setHora(slots[0] ?? "");
  }, [slots]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sai do modo agora quando o usuário muda período ou data
  useEffect(() => {
    if (agoraMode) setAgoraMode(false);
  }, [period, data]); // eslint-disable-line react-hooks/exhaustive-deps

  // Quando duração muda em agoraMode, mantém o modo mas recalcula o feedback
  // (hora permanece a mesma, mas o fimReserva muda — o bloco abaixo já é reativo)

  // Contador em tempo real de quanto resta no turno (atualiza a cada 30s)
  useEffect(() => {
    if (!agoraMode) return;

    const update = () => {
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      const fechMin = toMin(shiftWindow.fechamento);
      const restante = fechMin - nowMin;
      if (restante <= 0) {
        setTempoRestante("Turno encerrado");
      } else {
        const h = Math.floor(restante / 60);
        const m = restante % 60;
        setTempoRestante(h > 0 ? `${h}h ${m}min restantes no turno` : `${m}min restantes no turno`);
      }
    };

    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, [agoraMode, shiftWindow.fechamento]);

  const handleReservarAgora = () => {
    setHora(getNowHHMM());
    setAgoraMode(true);
  };

  const cancelarAgoraMode = () => {
    setAgoraMode(false);
    setHora(slots[0] ?? "");
  };

  // Cálculos derivados
  const horaMin = hora ? toMin(hora) : 0;
  const fimReservaMin = hora ? horaMin + duracaoAtiva : 0;
  const aberturaMin = toMin(shiftWindow.abertura);
  const fechamentoMin = toMin(shiftWindow.fechamento);

  const fimReservaStr = hora ? minToHHMM(fimReservaMin) : null;
  const horaFitsTurno = hora ? horaMin >= aberturaMin && fimReservaMin <= fechamentoMin : false;

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
    setDuracao(maxDuracaoMin);
    setHora(slots[0] ?? "");
    setNome("");
    setTel("");
    setAgoraMode(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const submit = async () => {
    if (!mesa) {
      toast.error("Informe o número da mesa");
      return;
    }
    const mesaNum = Number(mesa);
    const maxMesa = config?.totalMesas ?? 999;
    if (mesaNum < 1 || mesaNum > maxMesa) {
      toast.error(
        `Mesa ${mesaNum} não existe. O restaurante tem ${maxMesa} mesa${maxMesa !== 1 ? "s" : ""}.`,
      );
      return;
    }
    if (tablesNeeded > 1 && mesaNum + tablesNeeded - 1 > maxMesa) {
      const lastMesa = mesaNum + tablesNeeded - 1;
      toast.error(
        `São necessárias ${tablesNeeded} mesas consecutivas (${mesaNum}–${lastMesa}), mas o restaurante tem apenas ${maxMesa} mesas.`,
      );
      return;
    }
    if (!data) {
      toast.error("Informe a data");
      return;
    }
    if (!hora) {
      toast.error("Informe o horário");
      return;
    }
    if (qtd < 1) {
      toast.error("Informe a quantidade de pessoas");
      return;
    }
    const nomeClienteTrim = nomeCliente.trim();
    if (!nomeClienteTrim) {
      toast.error("Informe o nome do cliente");
      return;
    }
    const phoneDigits = telefone.replace(/\D/g, "");
    if (phoneDigits.length === 0) {
      toast.error("Informe o telefone do cliente");
      return;
    }
    if (phoneDigits.length < 10) {
      toast.error("Telefone incompleto. Informe o DDD e o número completo.");
      return;
    }

    const hMin = toMin(hora);
    const fimMin = hMin + duracaoAtiva;
    const turnoNome = period === "lunch" ? "Almoço" : "Jantar";

    if (hMin < aberturaMin) {
      toast.error(`O ${turnoNome} começa às ${shiftWindow.abertura}`);
      return;
    }
    if (fimMin > fechamentoMin) {
      const ultimo = slots[slots.length - 1];
      toast.error(
        `A reserva terminaria às ${minToHHMM(fimMin)}, ultrapassando o ${turnoNome} (encerra às ${shiftWindow.fechamento}). Último horário disponível: ${ultimo ?? "—"}`,
      );
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    if (data === today) {
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      if (hMin <= nowMin) {
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
        duracaoMinutos: duracaoAtiva,
        nomeCliente: nomeClienteTrim,
        telefone: telefone.trim(),
      });

      const mesasLabel =
        result.mesas.length > 1 ? `Mesas ${result.mesas.join(", ")}` : `Mesa ${result.mesas[0]}`;
      toast.success(`${mesasLabel} reservada${result.mesas.length > 1 ? "s" : ""} com sucesso!`);

      await queryClient.invalidateQueries({ queryKey: ["reservations"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["tables"] });
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
  const turnoNome = period === "lunch" ? "Almoço" : "Jantar";

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
                max={config?.totalMesas ?? 999}
                value={mesa}
                onChange={(e) => setMesa(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="Ex.: 10"
              />
              {config && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Mesas disponíveis: 1 a {config.totalMesas}
                </p>
              )}
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

          {/* Duração */}
          <div>
            <Label>Quanto tempo vai ficar?</Label>
            <Select value={String(duracaoAtiva)} onValueChange={(v) => setDuracao(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {duracaoOptions.map((opt) => (
                  <SelectItem key={opt} value={String(opt)}>
                    {formatDuracao(opt)}
                    {opt === maxDuracaoMin ? " (máximo)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Máximo permitido: {formatDuracao(maxDuracaoMin)}
            </p>
          </div>

          {/* Horário */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <Label>Horário de chegada</Label>
              <button
                type="button"
                onClick={agoraMode ? cancelarAgoraMode : handleReservarAgora}
                className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                  agoraMode
                    ? "bg-primary text-primary-foreground"
                    : "border border-input bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                <Clock className="h-3 w-3" />
                {agoraMode ? "Cancelar" : "Reservar agora"}
              </button>
            </div>

            {agoraMode ? (
              /* Modo "Reservar agora" — exibe horário capturado e status em tempo real */
              <div
                className={`rounded-md border px-3 py-2.5 ${
                  horaFitsTurno
                    ? "border-emerald-500/40 bg-emerald-500/5"
                    : "border-destructive/40 bg-destructive/5"
                }`}
              >
                <div className="flex items-start gap-2">
                  {horaFitsTurno ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-medium ${horaFitsTurno ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}`}
                    >
                      {horaFitsTurno
                        ? `Entrada: ${hora} · Saída: ${fimReservaStr}`
                        : `Horário inválido: ${hora} → término ${fimReservaStr}`}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {horaFitsTurno ? (
                        <>
                          {turnoNome} encerra às{" "}
                          <span className="font-medium">{shiftWindow.fechamento}</span> ·{" "}
                          {tempoRestante}
                        </>
                      ) : horaMin < aberturaMin ? (
                        <>
                          O {turnoNome} só começa às{" "}
                          <span className="font-medium">{shiftWindow.abertura}</span>
                        </>
                      ) : (
                        <>
                          Reserva de {formatDuracao(duracaoAtiva)} ultrapassaria o {turnoNome}{" "}
                          (encerra às <span className="font-medium">{shiftWindow.fechamento}</span>
                          ). Último horário disponível:{" "}
                          <span className="font-medium">{slots[slots.length - 1] ?? "—"}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ) : slots.length > 0 ? (
              /* Modo normal — dropdown com slots de 30 em 30 min */
              <Select value={hora} onValueChange={setHora}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o horário" />
                </SelectTrigger>
                <SelectContent>
                  {slots.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s} → {minToHHMM(toMin(s) + duracaoAtiva)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex h-10 items-center rounded-md border border-input px-3 text-sm text-muted-foreground">
                Sem horários disponíveis neste turno
              </div>
            )}

            <p className="mt-1 text-[11px] text-muted-foreground">
              {turnoNome}: {shiftWindow.abertura} – {shiftWindow.fechamento}
              {slots.length > 0 && !agoraMode && (
                <>
                  {" "}
                  · último horário: <span className="font-medium">{slots[slots.length - 1]}</span>
                </>
              )}
            </p>
          </div>

          {/* Nome e Telefone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Nome do cliente</Label>
              <Input
                type="text"
                required
                value={nomeCliente}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: João Silva"
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                type="tel"
                inputMode="numeric"
                maxLength={15}
                required
                value={telefone}
                onChange={(e) => setTel(maskTelefone(e.target.value))}
                placeholder="(11) 99999-9999"
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
                  <span className="font-medium text-foreground">{mesasJuntadas.join(", ")}</span>{" "}
                  serão reservadas juntas.
                </p>
              </div>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground">
            O tempo de limpeza pós-reserva é definido nas configurações do sistema.
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={loading || (agoraMode && !horaFitsTurno)}>
            {loading ? "Reservando…" : "Confirmar reserva"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
