import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Users, DollarSign, Calendar, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({ component: AdminDashboard });

function AdminDashboard() {
  const { data } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const start = new Date(); start.setHours(0,0,0,0);
      const end = new Date(); end.setHours(23,59,59,999);
      const [subs, todayAppts, recentAppts] = await Promise.all([
        supabase.from("subscriptions").select("status, plans(price_cents)").neq("status", "CANCELLED"),
        supabase.from("appointments").select("id").gte("scheduled_at", start.toISOString()).lte("scheduled_at", end.toISOString()),
        supabase.from("appointments").select("scheduled_at, status, profiles!appointments_user_id_fkey(full_name), barbers(full_name)").order("scheduled_at", { ascending: false }).limit(8),
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do BarberPass.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Stat icon={<Users />} label="Assinantes ativos" value={data?.active ?? 0} />
        <Stat icon={<DollarSign />} label="Receita mensal" value={((data?.mrr ?? 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
        <Stat icon={<Calendar />} label="Agendamentos hoje" value={data?.todayCount ?? 0} />
        <Stat icon={<TrendingUp />} label="Taxa de churn" value={`${data?.churnRate ?? 0}%`} />
      </div>
      <Card className="p-6">
        <h3 className="text-lg">Últimos agendamentos</h3>
        <div className="mt-4 divide-y divide-border">
          {!data?.recent?.length && <div className="py-4 text-sm text-muted-foreground">Sem agendamentos ainda.</div>}
          {data?.recent?.map((a: any, i) => (
            <div key={i} className="flex items-center justify-between py-3 text-sm">
              <div>
                <div className="font-medium">{a.profiles?.full_name ?? "Cliente"}</div>
                <div className="text-xs text-muted-foreground">{a.barbers?.full_name} • {new Date(a.scheduled_at).toLocaleString("pt-BR")}</div>
              </div>
              <span className="text-xs text-muted-foreground">{a.status}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <Card className="p-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">{icon}</div>
      <div className="mt-3 text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </Card>
  );
}
