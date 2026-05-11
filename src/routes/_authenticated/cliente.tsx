import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { DashboardShell } from "@/components/DashboardShell";

export const Route = createFileRoute("/_authenticated/cliente")({ component: ClienteLayout });

function ClienteLayout() {
  const { roles, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (loading) return;
    if (roles.includes("admin")) navigate({ to: "/admin" });
    else if (roles.includes("barbeiro") && !roles.includes("cliente")) navigate({ to: "/barbeiro" });
  }, [roles, loading, navigate]);

  return (
    <DashboardShell nav={[
      { to: "/cliente", label: "Meu plano" },
      { to: "/cliente/agendar", label: "Agendar" },
      { to: "/cliente/historico", label: "Histórico" },
      { to: "/cliente/planos", label: "Planos" },
    ]}>
      <Outlet />
    </DashboardShell>
  );
}
