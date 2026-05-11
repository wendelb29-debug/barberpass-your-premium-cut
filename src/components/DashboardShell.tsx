import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/hooks/use-auth";
import { LogOut } from "lucide-react";

interface NavItem { to: string; label: string }

export function DashboardShell({ nav, children }: { nav: NavItem[]; children: ReactNode }) {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-gradient-dark">
      <header className="border-b border-border/60 bg-background/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link to="/"><Logo /></Link>
          <div className="hidden items-center gap-1 md:flex">
            {nav.map((n) => {
              const active = path === n.to || (n.to !== "/" && path.startsWith(n.to));
              return (
                <Link key={n.to} to={n.to}
                  className={`rounded-md px-3 py-1.5 text-sm transition-colors ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                  {n.label}
                </Link>
              );
            })}
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground md:inline">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate({ to: "/" }); }}>
              <LogOut size={16} className="mr-1" /> Sair
            </Button>
          </div>
        </div>
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-6 pb-3 md:hidden">
          {nav.map((n) => {
            const active = path === n.to;
            return (
              <Link key={n.to} to={n.to}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm ${active ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>
                {n.label}
              </Link>
            );
          })}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
