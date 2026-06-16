import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { useAuthStore } from "@/features/auth/useAuthStore";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Login — WA Restaurant" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const setToken = useAuthStore((s) => s.setToken);

  const [email, setEmail]       = useState("admin@restaurant.local");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast.error("Preencha e-mail e senha");
      return;
    }

    setLoading(true);
    try {
      const { accessToken } = await api.auth.login(email, password);
      setToken(accessToken);
      await navigate({ to: "/" });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Erro ao conectar com o servidor";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background wa-grain px-4">
      <div className="w-full max-w-sm">
        {/* Logo / Marca */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-gold/30 bg-card">
            <Utensils className="h-6 w-6 text-gold" />
          </div>
          <p className="text-[10px] uppercase tracking-[0.32em] text-gold">和 · Harmonia</p>
          <h1 className="mt-1 font-display text-3xl text-foreground">WA Restaurant</h1>
          <p className="mt-1 text-sm text-muted-foreground">Acesso restrito à equipe</p>
        </div>

        {/* Card de Login */}
        <form
          onSubmit={handleSubmit}
          className="rounded-md border border-border/60 bg-card p-6 shadow-sm"
        >
          <div className="space-y-4">
            {/* E-mail */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@restaurant.local"
                disabled={loading}
                className="bg-background"
              />
            </div>

            {/* Senha */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  className="bg-background pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showPwd ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            className="mt-6 w-full"
            disabled={loading}
          >
            {loading ? "Entrando…" : "Entrar"}
          </Button>
        </form>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Santana · São Paulo — Operação WA
        </p>
      </div>
    </div>
  );
}
