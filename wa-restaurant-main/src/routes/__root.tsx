import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect } from "react";

import { reportError } from "../lib/error-reporting";
import { AppSidebar, BottomNav } from "@/components/layout/AppSidebar";
import { Toaster } from "@/components/ui/sonner";
import { useAuthStore } from "@/features/auth/useAuthStore";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl text-foreground">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">Página não encontrada.</p>
        <a href="/" className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Voltar ao dashboard
        </a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    reportError(error, { boundary: "root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-xl text-foreground">Algo deu errado</h1>
        <p className="mt-2 text-sm text-muted-foreground">Tente novamente em instantes.</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  const isLoginPage = pathname === "/login";

  useEffect(() => {
    if (!isAuthenticated && !isLoginPage) {
      navigate({ to: "/login" });
    } else if (isAuthenticated && isLoginPage) {
      navigate({ to: "/" });
    }
  }, [isAuthenticated, isLoginPage, navigate]);

  if (isLoginPage) {
    return (
      <QueryClientProvider client={queryClient}>
        <Outlet />
        <Toaster />
      </QueryClientProvider>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen w-full bg-background wa-grain">
        <AppSidebar />
        <main className="flex-1 pb-20 md:pb-0">
          <Outlet />
        </main>
        <BottomNav />
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}
