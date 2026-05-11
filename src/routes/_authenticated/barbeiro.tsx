import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { DashboardShell } from "@/components/DashboardShell";

export const Route = createFileRoute("/_authenticated/barbeiro")({ component: BarberLayout });

function BarberLayout() {
  const { roles, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (loading) return;
    if (!roles.includes("barbeiro") && !roles.includes("admin")) navigate({ to: "/cliente" });
  }, [roles, loading, navigate]);
  return (
    <DashboardShell nav={[
      { to: "/barbeiro", label: "Agenda do dia" },
      { to: "/atendimento", label: "Atendimento" },
    ]}>
      <Outlet />
    </DashboardShell>
  );
}
