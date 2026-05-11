import type { ComponentType, ReactNode } from "react";
import {
  LayoutDashboard, CalendarDays, Users2, CreditCard, BarChart3,
  Scissors, MessageSquare, Settings2, LogOut, History, Crown,
} from "lucide-react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Icon = ComponentType<{ size?: number; className?: string }>;

export interface NavItem {
  to: string;
  label: string;
  icon: Icon;
  exact?: boolean;
}

export type Scope = "admin" | "barbeiro" | "cliente";

const NAV: Record<Scope, { groups: NavItem[][]; mobile: NavItem[] }> = {
  admin: {
    groups: [
      [
        { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
        { to: "/admin/clientes", label: "Clientes", icon: Users2 },
        { to: "/admin/barbeiros", label: "Barbeiros", icon: Scissors },
      ],
      [
        { to: "/atendimento", label: "Atendimento", icon: MessageSquare },
        { to: "/admin/relatorios", label: "Relatórios", icon: BarChart3 },
      ],
    ],
    mobile: [
      { to: "/admin", label: "Início", icon: LayoutDashboard, exact: true },
      { to: "/admin/clientes", label: "Clientes", icon: Users2 },
      { to: "/atendimento", label: "Chat", icon: MessageSquare },
      { to: "/admin/relatorios", label: "Relatórios", icon: BarChart3 },
    ],
  },
  barbeiro: {
    groups: [
      [
        { to: "/barbeiro", label: "Agenda do dia", icon: CalendarDays, exact: true },
        { to: "/atendimento", label: "Atendimento", icon: MessageSquare },
      ],
    ],
    mobile: [
      { to: "/barbeiro", label: "Agenda", icon: CalendarDays, exact: true },
      { to: "/atendimento", label: "Chat", icon: MessageSquare },
    ],
  },
  cliente: {
    groups: [
      [
        { to: "/cliente", label: "Meu plano", icon: Crown, exact: true },
        { to: "/cliente/agendar", label: "Agendar", icon: CalendarDays },
        { to: "/cliente/historico", label: "Histórico", icon: History },
      ],
      [
        { to: "/cliente/planos", label: "Planos", icon: CreditCard },
      ],
    ],
    mobile: [
      { to: "/cliente", label: "Plano", icon: Crown, exact: true },
      { to: "/cliente/agendar", label: "Agendar", icon: CalendarDays },
      { to: "/cliente/historico", label: "Histórico", icon: History },
      { to: "/cliente/planos", label: "Planos", icon: CreditCard },
    ],
  },
};

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(item.to + "/");
}

export function AppShell({ scope, children }: { scope: Scope; children: ReactNode }) {
  const nav = NAV[scope];
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => { await signOut(); navigate({ to: "/" }); };

  const initials = (user?.email ?? "U")
    .split("@")[0].slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-sidebar-border bg-sidebar md:flex"
        style={{ width: "var(--sidebar-w)" }}
      >
        <div className="flex h-14 items-center px-4">
          <Link to="/" className="flex items-center gap-2"><Logo size="sm" /></Link>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
          {nav.groups.map((group, gi) => (
            <div key={gi} className={cn("flex flex-col gap-0.5", gi > 0 && "mt-3 border-t border-border/40 pt-3")}>
              {group.map((item) => {
                const active = isActive(path, item);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors duration-100",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                    )}
                  >
                    {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r bg-primary" />}
                    <item.icon size={16} className={active ? "text-primary" : "text-muted-foreground/80"} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="border-t border-border/40 p-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-[11px] font-semibold text-foreground">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] text-muted-foreground">{user?.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
              aria-label="Sair"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="md:ml-[var(--sidebar-w)] min-h-screen pb-20 md:pb-0">
        <div className="mx-auto w-full max-w-6xl px-5 py-8 md:px-8 md:py-10">
          {children}
        </div>
      </main>

      {/* Mobile bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/95 backdrop-blur md:hidden">
        <div className="flex items-center justify-around px-2 py-2">
          {nav.mobile.map((item) => {
            const active = isActive(path, item);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-md transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
                aria-label={item.label}
              >
                <item.icon size={20} />
              </Link>
            );
          })}
          <button
            onClick={handleSignOut}
            className="flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground"
            aria-label="Sair"
          >
            <LogOut size={20} />
          </button>
        </div>
      </nav>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-[32px] font-semibold leading-tight tracking-tight md:text-[40px]">{title}</h1>
        {subtitle && <p className="mt-1 text-[14px] text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// Re-export for convenience
export { LayoutDashboard, CalendarDays, Users2, CreditCard, BarChart3, Scissors, MessageSquare, Settings2 };
