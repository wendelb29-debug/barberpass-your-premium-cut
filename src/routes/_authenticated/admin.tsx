import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/admin")({ component: AdminLayout });

function AdminLayout() {
  const { roles, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (loading) return;
    if (!roles.includes("admin")) navigate({ to: "/cliente" });
  }, [roles, loading, navigate]);
  return (
    <AppShell scope="admin">
      <Outlet />
    </AppShell>
  );
}
