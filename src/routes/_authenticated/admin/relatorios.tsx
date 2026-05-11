import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Download, Users2, CreditCard, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import type { ComponentType } from "react";

export const Route = createFileRoute("/_authenticated/admin/relatorios")({ component: AdminReports });

function csv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  const head = keys.join(",");
  const body = rows.map((r) => keys.map((k) => JSON.stringify(r[k] ?? "")).join(",")).join("\n");
  return head + "\n" + body;
}

function download(name: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}

function AdminReports() {
  const exportClients = async () => {
    const { data, error } = await supabase.from("profiles").select("id, full_name, phone, created_at");
    if (error) return toast.error(error.message);
    download("clientes.csv", csv(data ?? []));
  };
  const exportSubs = async () => {
    const { data, error } = await supabase.from("subscriptions").select("id, user_id, plan_id, status, next_due_date, started_at");
    if (error) return toast.error(error.message);
    download("assinaturas.csv", csv(data ?? []));
  };
  const exportAppts = async () => {
    const { data, error } = await supabase.from("appointments").select("id, user_id, barber_id, scheduled_at, service_type, status");
    if (error) return toast.error(error.message);
    download("agendamentos.csv", csv(data ?? []));
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Relatórios" subtitle="Exporte os dados em CSV." />
      <div className="grid gap-4 md:grid-cols-3">
        <ReportCard icon={Users2} title="Clientes" desc="Lista de todos os usuários cadastrados." onClick={exportClients} />
        <ReportCard icon={CreditCard} title="Assinaturas" desc="Status e datas de cobrança." onClick={exportSubs} />
        <ReportCard icon={CalendarDays} title="Agendamentos" desc="Histórico completo de atendimentos." onClick={exportAppts} />
      </div>
    </div>
  );
}

function ReportCard({
  icon: Icon, title, desc, onClick,
}: { icon: ComponentType<{ size?: number; className?: string }>; title: string; desc: string; onClick: () => void }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:border-border/80">
      <div className="flex items-start justify-between">
        <span className="label-eyebrow">{title}</span>
        <Icon size={14} className="text-muted-foreground/40" />
      </div>
      <p className="text-[13px] leading-relaxed text-muted-foreground">{desc}</p>
      <Button onClick={onClick} variant="outline" className="h-9 w-full rounded-[8px] border-border/60 bg-transparent text-[13px] hover:bg-white/5">
        <Download size={14} className="mr-1.5" /> Baixar CSV
      </Button>
    </div>
  );
}
