import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/barbeiro")({ component: BarberLayout });

function BarberLayout() {
  const { roles, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (loading) return;
    if (!roles.includes("barbeiro") && !roles.includes("admin")) navigate({ to: "/cliente" });
  }, [roles, loading, navigate]);
  return (
    <AppShell scope="barbeiro">
      <Outlet />
    </AppShell>
  );
}
