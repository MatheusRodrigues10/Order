import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, CalendarDays, Clock4, Settings, BookMarked, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/Logo";
import { useAuthStore } from "@/features/auth/useAuthStore";
import { toast } from "sonner";

const NAV = [
  { to: "/",                label: "Dashboard",     icon: LayoutDashboard },
  { to: "/reservations",    label: "Reservas",      icon: BookMarked },
  { to: "/calendar",        label: "Agenda",        icon: CalendarDays },
  { to: "/operating-hours", label: "Funcionamento", icon: Clock4 },
  { to: "/settings",        label: "Configurações", icon: Settings },
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

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const logout = useLogout();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-sidebar-border bg-sidebar/95 backdrop-blur md:hidden">
      <div className="grid grid-cols-6">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[10px] tracking-wide",
                active ? "text-gold" : "text-muted-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={logout}
          className="flex flex-col items-center gap-1 py-2.5 text-[10px] tracking-wide text-muted-foreground"
        >
          <LogOut className="h-4 w-4" />
          <span>Sair</span>
        </button>
      </div>
    </nav>
  );
}
