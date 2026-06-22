import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  Clock4,
  Settings,
  BookMarked,
  LogOut,
  CalendarOff,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/Logo";
import { useAuthStore } from "@/features/auth/useAuthStore";
import { toast } from "sonner";

const NAV = [
  { to: "/", label: "Dashboard", shortLabel: "Início", icon: LayoutDashboard },
  { to: "/reservations", label: "Reservas", shortLabel: "Reservas", icon: BookMarked },
  { to: "/calendar", label: "Agenda", shortLabel: "Agenda", icon: CalendarDays },
  { to: "/operating-hours", label: "Funcionamento", shortLabel: "Turnos", icon: Clock4 },
  { to: "/event-days", label: "Eventos", shortLabel: "Eventos", icon: CalendarOff },
  { to: "/settings", label: "Configurações", shortLabel: "Config.", icon: Settings },
] as const;

function useLogout() {
  const clearToken = useAuthStore((s) => s.clearToken);
  const navigate = useNavigate();
  return () => {
    clearToken();
    toast.success("Sessão encerrada");
    navigate({ to: "/login" });
  };
}

// ── Sidebar desktop ──────────────────────────────────────────────────────────

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const logout = useLogout();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <div className="px-5 py-6 border-b border-sidebar-border">
        <Logo />
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                active && "bg-sidebar-accent text-sidebar-foreground",
              )}
            >
              <Icon className={cn("h-4 w-4", active ? "text-gold" : "text-muted-foreground")} />
              <span className="tracking-wide">{item.label}</span>
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-gold" />}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border px-3 py-4">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <LogOut className="h-4 w-4 text-muted-foreground" />
          <span className="tracking-wide">Sair</span>
        </button>
        <div className="mt-3 px-3">
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Santana · São Paulo
          </p>
          <p className="mt-1 text-xs text-sidebar-foreground/70">Operação WA</p>
        </div>
      </div>
    </aside>
  );
}

// ── Header mobile com hamburger ───────────────────────────────────────────────

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const logout = useLogout();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Header fixo no topo */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-sidebar-border bg-sidebar/95 px-4 backdrop-blur md:hidden">
        <Logo />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md p-2 text-muted-foreground transition hover:text-foreground"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer lateral */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-72 flex-col bg-sidebar shadow-2xl transition-transform duration-300 md:hidden",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-sidebar-border px-5 py-4">
          <Logo />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md p-2 text-muted-foreground transition hover:text-foreground"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-3 text-sm transition-colors",
                  "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                  active && "bg-sidebar-accent text-sidebar-foreground",
                )}
              >
                <Icon className={cn("h-4 w-4", active ? "text-gold" : "text-muted-foreground")} />
                <span className="tracking-wide">{item.label}</span>
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-gold" />}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border px-3 py-4">
          <button
            onClick={() => { setOpen(false); logout(); }}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <LogOut className="h-4 w-4 text-muted-foreground" />
            <span className="tracking-wide">Sair</span>
          </button>
          <div className="mt-3 px-3">
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Santana · São Paulo
            </p>
            <p className="mt-1 text-xs text-sidebar-foreground/70">Operação WA</p>
          </div>
        </div>
      </div>
    </>
  );
}
