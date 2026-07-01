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
import { api, ApiError, type HorarioFuncionamento, type Config, type EventDay } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, Clock, AlertTriangle, CheckCircle2, CalendarOff, Ban } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
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
  onSuccess,
  initialPeriod,
  initialDate,
}: Props) {
  const queryClient = useQueryClient();

  const defaultPeriod = (): "lunch" | "dinner" =>
    initialPeriod ?? (new Date().getHours() < 15 ? "lunch" : "dinner");

  const [qtd, setQtd] = useState<number | "">(2);
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

  const { data: eventDays = [] } = useQuery<EventDay[]>({
    queryKey: ["event-days"],
    queryFn: api.admin.listarEventDays,
    staleTime: 300_000,
  });

  const eventDayInfo = useMemo(
    () => eventDays.find((e) => e.data === data) ?? null,
    [eventDays, data],
  );

  const dayOfWeek = new Date(data + "T12:00:00").getDay();
  const isLunchClosed = useMemo(
    () => horarios.length > 0 && !horarios.some((h) => h.diaSemana === dayOfWeek && h.turno === 1 && h.ativo),
    [horarios, dayOfWeek],
  );
  const isDinnerClosed = useMemo(
    () => horarios.length > 0 && !horarios.some((h) => h.diaSemana === dayOfWeek && h.turno === 2 && h.ativo),
    [horarios, dayOfWeek],
  );
  const isRestaurantClosed = isLunchClosed && isDinnerClosed;
  const isCurrentShiftClosed = period === "lunch" ? isLunchClosed : isDinnerClosed;

  const maxDuracaoMin = config?.duracaoReservaMinutos ?? 120;

  const duracaoOptions = useMemo(() => {
    const opts: number[] = [];
    for (let m = 30; m <= maxDuracaoMin; m += 30) opts.push(m);
    return opts;
  }, [maxDuracaoMin]);

  const duracaoAtiva = duracao > 0 ? duracao : maxDuracaoMin;

  useEffect(() => {
    if (!open) return;
    const d = initialDate ?? new Date().toISOString().slice(0, 10);
    const p = initialPeriod ?? (new Date().getHours() < 15 ? "lunch" : "dinner");
    setData(d);
    setPeriod(p);
    setQtd("");
    setDuracao(maxDuracaoMin);
    setNome("");
    setTel("");
    setAgoraMode(false);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (config && duracao === 0) setDuracao(config.duracaoReservaMinutos);
  }, [config]); // eslint-disable-line react-hooks/exhaustive-deps

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

  useEffect(() => {
    if (!agoraMode) setHora(slots[0] ?? "");
  }, [slots]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (agoraMode) setAgoraMode(false);
  }, [period, data]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const horaMin = hora ? toMin(hora) : 0;
  const fimReservaMin = hora ? horaMin + duracaoAtiva : 0;
  const aberturaMin = toMin(shiftWindow.abertura);
  const fechamentoMin = toMin(shiftWindow.fechamento);

  const fimReservaStr = hora ? minToHHMM(fimReservaMin) : null;
  const horaFitsTurno = hora ? horaMin >= aberturaMin && fimReservaMin <= fechamentoMin : false;

  const lugaresPorMesa = config?.lugaresPorMesa ?? 4;
  const tablesNeeded = qtd !== "" ? Math.ceil(qtd / lugaresPorMesa) : 1;

  const reset = () => {
    setQtd("");
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
    if (!data) {
      toast.error("Informe a data");
      return;
    }
    if (eventDayInfo) {
      toast.error("Restaurante fechado para evento neste dia");
      return;
    }
    if (!hora) {
      toast.error("Informe o horário");
      return;
    }
    if (qtd === "" || qtd < 1) {
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
        quantidadePessoas: qtd as number,
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
      <DialogContent className="max-w-md max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Nova reserva</DialogTitle>
          <DialogDescription>Preencha os dados para reservar uma mesa.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {/* Pessoas */}
          <div>
            <Label>Pessoas</Label>
            <Input
              type="number"
              min={1}
              max={999}
              value={qtd}
              onChange={(e) => setQtd(e.target.value === "" ? "" : Number(e.target.value))}
              className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>

          {/* Data + Turno */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label>Data</Label>
              <Input
                type="date"
                value={data}
                min={today}
                onChange={(e) => setData(e.target.value)}
                className={eventDayInfo ? "border-destructive focus-visible:ring-destructive" : ""}
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
                  <TabsTrigger value="lunch" className="flex-1 gap-1 text-xs">
                    Almoço
                    {isLunchClosed && <Ban className="h-3 w-3 text-orange-400" />}
                  </TabsTrigger>
                  <TabsTrigger value="dinner" className="flex-1 gap-1 text-xs">
                    Jantar
                    {isDinnerClosed && <Ban className="h-3 w-3 text-orange-400" />}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Aviso dia de evento */}
          {eventDayInfo && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-sm">
              <CalendarOff className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div>
                <span className="font-medium text-destructive">Restaurante fechado — dia de evento</span>
                {eventDayInfo.motivo && (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{eventDayInfo.motivo}</p>
                )}
              </div>
            </div>
          )}

          {/* Aviso restaurante fechado (ambos turnos sem operação) */}
          {!eventDayInfo && isRestaurantClosed && (
            <div className="flex items-start gap-2 rounded-md border border-orange-500/30 bg-orange-500/5 px-3 py-2.5 text-sm">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
              <div>
                <span className="font-medium text-orange-400">Restaurante fechado neste dia</span>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Nenhum turno ativo para este dia da semana
                </p>
              </div>
            </div>
          )}

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
              {!isCurrentShiftClosed && (
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
              )}
            </div>

            {isCurrentShiftClosed ? (
              <div className="flex items-start gap-2 rounded-md border border-orange-500/30 bg-orange-500/5 px-3 py-2.5 text-sm">
                <Ban className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
                <div>
                  <span className="font-medium text-orange-400">
                    Turno de {period === "lunch" ? "almoço" : "jantar"} fechado neste dia
                  </span>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {period === "lunch" ? "Selecione o turno de jantar" : "Selecione o turno de almoço"} para verificar disponibilidade
                  </p>
                </div>
              </div>
            ) : agoraMode ? (
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

            {!isCurrentShiftClosed && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {turnoNome}: {shiftWindow.abertura} – {shiftWindow.fechamento}
                {slots.length > 0 && !agoraMode && (
                  <>
                    {" "}
                    · último horário: <span className="font-medium">{slots[slots.length - 1]}</span>
                  </>
                )}
              </p>
            )}
          </div>

          {/* Nome e Telefone */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          {tablesNeeded > 1 && (
            <div className="flex items-start gap-2 rounded-md border border-gold/30 bg-gold/5 px-3 py-2.5 text-sm">
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              <div>
                <span className="font-medium text-foreground">
                  {tablesNeeded} mesas serão unidas
                </span>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Para {qtd || 0} pessoas ({lugaresPorMesa} por mesa), {tablesNeeded} mesas consecutivas
                  serão reservadas automaticamente.
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
          <Button onClick={submit} disabled={loading || (agoraMode && !horaFitsTurno) || !!eventDayInfo || isCurrentShiftClosed || isRestaurantClosed}>
            {loading ? "Reservando…" : "Confirmar reserva"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
