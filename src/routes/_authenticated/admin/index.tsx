import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users2, DollarSign, CalendarDays, TrendingDown } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { StatusBadge } from "@/components/StatusBadge";
import { InitialsAvatar } from "@/components/Avatar";
import { PageHeader } from "@/components/AppShell";
import { DataTable, TH, THead, TBody, TR, TD, EmptyRow } from "@/components/DataTable";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/admin/")({ component: AdminDashboard });

function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const end = new Date(); end.setHours(23, 59, 59, 999);
      const [subs, todayAppts, recentAppts] = await Promise.all([
        supabase.from("subscriptions").select("status, plans(price_cents)").neq("status", "CANCELLED"),
        supabase.from("appointments").select("id").gte("scheduled_at", start.toISOString()).lte("scheduled_at", end.toISOString()),
        supabase.from("appointments").select("id, scheduled_at, status, service_type, profiles!appointments_user_id_fkey(full_name), barbers(full_name)").order("scheduled_at", { ascending: false }).limit(8),
      ]);
      const active = subs.data?.filter((s) => s.status === "ACTIVE") ?? [];
      const mrr = active.reduce((acc, s: any) => acc + (s.plans?.price_cents ?? 0), 0);
      return {
        active: active.length,
        mrr,
        todayCount: todayAppts.data?.length ?? 0,
        churnRate: subs.data?.length ? Math.round((1 - active.length / subs.data.length) * 100) : 0,
        recent: recentAppts.data ?? [],
      };
    },
  });

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Dashboard" subtitle="Visão geral do BarberPass." />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[112px] rounded-xl" />)
        ) : (
          <>
            <MetricCard label="Assinantes ativos" value={data?.active ?? 0} icon={Users2} />
            <MetricCard
              label="Receita mensal"
              value={((data?.mrr ?? 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              icon={DollarSign}
            />
            <MetricCard label="Agendamentos hoje" value={data?.todayCount ?? 0} icon={CalendarDays} />
            <MetricCard label="Taxa de churn" value={`${data?.churnRate ?? 0}%`} icon={TrendingDown} />
          </>
        )}
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex items-end justify-between">
          <h2 className="text-[20px] font-medium tracking-tight">Últimos agendamentos</h2>
        </div>
        <DataTable>
          <THead>
            <TH>Cliente</TH>
            <TH>Barbeiro</TH>
            <TH>Serviço</TH>
            <TH>Data e hora</TH>
            <TH>Status</TH>
            <TH className="text-right">Ações</TH>
          </THead>
          <TBody>
            {!data?.recent?.length && <EmptyRow colSpan={6}>Sem agendamentos ainda.</EmptyRow>}
            {data?.recent?.map((a: any) => (
              <TR key={a.id}>
                <TD>
                  <div className="flex items-center gap-2.5">
                    <InitialsAvatar name={a.profiles?.full_name} />
                    <span className="font-medium">{a.profiles?.full_name ?? "Cliente"}</span>
                  </div>
                </TD>
                <TD className="text-muted-foreground">{a.barbers?.full_name ?? "—"}</TD>
                <TD className="text-muted-foreground">{a.service_type ?? "—"}</TD>
                <TD className="tnum text-muted-foreground">
                  {new Date(a.scheduled_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                </TD>
                <TD><StatusBadge status={a.status} /></TD>
                <TD className="text-right">
                  <button className="text-[12px] text-muted-foreground transition-colors hover:text-foreground">
                    Ver detalhes
                  </button>
                </TD>
              </TR>
            ))}
          </TBody>
        </DataTable>
      </section>
    </div>
  );
}
