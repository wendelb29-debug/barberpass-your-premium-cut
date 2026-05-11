import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { DashboardShell } from "@/components/DashboardShell";

export const Route = createFileRoute("/_authenticated/admin")({ component: AdminLayout });

function AdminLayout() {
  const { roles, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (loading) return;
    if (!roles.includes("admin")) navigate({ to: "/cliente" });
  }, [roles, loading, navigate]);
  return (
    <DashboardShell nav={[
      { to: "/admin", label: "Dashboard" },
      { to: "/admin/clientes", label: "Clientes" },
      { to: "/admin/barbeiros", label: "Barbeiros" },
      { to: "/admin/relatorios", label: "Relatórios" },
    ]}>
      <Outlet />
    </DashboardShell>
  );
}
