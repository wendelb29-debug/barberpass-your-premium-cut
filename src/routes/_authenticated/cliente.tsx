import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/AppShell";

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
    <AppShell scope="cliente">
      <Outlet />
    </AppShell>
  );
}
