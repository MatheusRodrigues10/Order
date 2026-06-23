import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Config, ApiError } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Configurações — WA Restaurant" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: config, isLoading } = useQuery<Config>({
    queryKey: ["config"],
    queryFn: api.admin.getConfig,
  });

  const [totalMesas, setTotalMesas] = useState("");
  const [lugaresPorMesa, setLugares] = useState("");
  const [duracaoReservaMinutos, setDuracao] = useState("");
  const [tempoLimpezaMinutos, setLimpeza] = useState("");
  const [abertura, setAbertura] = useState("");
  const [fechamento, setFechamento] = useState("");
  const [pin, setPin] = useState("");

  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!config) return;
    setTotalMesas(String(config.totalMesas));
    setLugares(String(config.lugaresPorMesa));
    setDuracao(String(config.duracaoReservaMinutos));
    setLimpeza(String(config.tempoLimpezaMinutos));
    setAbertura(config.horarioAbertura);
    setFechamento(config.horarioFechamento);
  }, [config]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["config"] });

  const save = async (key: string, fn: () => Promise<unknown>) => {
    setSaving(key);
    try {
      await fn();
      toast.success("Configuração salva");
      await invalidate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao salvar");
    } finally {
      setSaving(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Carregando configurações…
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-6 md:px-8 md:py-10">
      <header className="mb-8">
        <p className="text-[10px] uppercase tracking-[0.32em] text-gold">Preferências</p>
        <h1 className="mt-1 font-display text-4xl text-foreground">Configurações</h1>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Horário global */}
        <Section title="Horário global">
          <p className="text-xs text-muted-foreground">
            Horário padrão usado quando não há turnos configurados para o dia.
          </p>
          <Field
            label="Abertura"
            type="time"
            value={abertura}
            onChange={setAbertura}
          />
          <Field
            label="Fechamento"
            type="time"
            value={fechamento}
            onChange={setFechamento}
          />
          <Button
            size="sm"
            disabled={saving === "horario"}
            onClick={() => {
              if (!abertura || !fechamento) {
                toast.error("Preencha abertura e fechamento");
                return;
              }
              if (abertura >= fechamento) {
                toast.error("Abertura deve ser anterior ao fechamento");
                return;
              }
              save("horario", () => api.admin.updateHorario(abertura, fechamento));
            }}
          >
            {saving === "horario" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar horário
          </Button>
        </Section>

        {/* PIN da API */}
        <Section title="PIN da API externa">
          <p className="text-xs text-muted-foreground">
            PIN usado para autenticar chamadas da IA via header X-API-PIN.
          </p>
          <Field
            label="Novo PIN (4-20 caracteres)"
            value={pin}
            onChange={setPin}
            placeholder="Digite o novo PIN"
          />
          <Button
            size="sm"
            disabled={saving === "pin" || pin.length < 4}
            onClick={() => {
              if (pin.length < 4 || pin.length > 20) {
                toast.error("PIN deve ter entre 4 e 20 caracteres");
                return;
              }
              save("pin", async () => {
                await api.admin.updatePin(pin);
                setPin("");
              });
            }}
          >
            {saving === "pin" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Atualizar PIN
          </Button>
        </Section>

        {/* Mesas */}
        <Section title="Mesas">
          <Field
            label="Quantidade total"
            type="number"
            value={totalMesas}
            onChange={setTotalMesas}
          />
          <Field
            label="Cadeiras por mesa"
            type="number"
            value={lugaresPorMesa}
            onChange={setLugares}
          />
          <Button
            size="sm"
            disabled={saving === "mesas"}
            onClick={() => {
              const m = Number(totalMesas);
              const l = Number(lugaresPorMesa);
              if (!Number.isInteger(m) || m < 1) {
                toast.error("Quantidade de mesas deve ser no mínimo 1");
                return;
              }
              if (!Number.isInteger(l) || l < 1) {
                toast.error("Cadeiras por mesa deve ser no mínimo 1");
                return;
              }
              save("mesas", async () => {
                await api.admin.updateMesas(m);
                await api.admin.updateCapacidade(l);
              });
            }}
          >
            {saving === "mesas" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar mesas
          </Button>
        </Section>

        {/* Tempos */}
        <Section title="Tempos padrão">
          <Field
            label="Duração máxima da reserva (min)"
            type="number"
            value={duracaoReservaMinutos}
            onChange={setDuracao}
          />
          <Field
            label="Tempo de limpeza (min)"
            type="number"
            value={tempoLimpezaMinutos}
            onChange={setLimpeza}
          />
          <Button
            size="sm"
            disabled={saving === "tempos"}
            onClick={() => {
              const dur = Number(duracaoReservaMinutos);
              const limp = Number(tempoLimpezaMinutos);
              if (!Number.isInteger(dur) || dur < 30) {
                toast.error("Duração mínima da reserva é 30 minutos");
                return;
              }
              if (!Number.isInteger(limp) || limp < 1) {
                toast.error("Tempo de limpeza deve ser no mínimo 1 minuto");
                return;
              }
              save("tempos", async () => {
                await api.admin.updateExpiracao(dur);
                await api.admin.updateLimpeza(limp);
              });
            }}
          >
            {saving === "tempos" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar tempos
          </Button>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border/60 bg-card p-5">
      <h3 className="font-display text-lg text-foreground">{title}</h3>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</Label>
      <Input
        className="mt-1"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
