import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Download } from "lucide-react";
import { toast } from "sonner";

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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl">Relatórios</h1>
        <p className="text-muted-foreground">Exporte os dados em CSV.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="space-y-3 p-6">
          <h3>Clientes</h3>
          <p className="text-sm text-muted-foreground">Lista de todos os usuários.</p>
          <Button onClick={exportClients}><Download size={16} className="mr-1" /> Baixar CSV</Button>
        </Card>
        <Card className="space-y-3 p-6">
          <h3>Assinaturas</h3>
          <p className="text-sm text-muted-foreground">Status e datas de cobrança.</p>
          <Button onClick={exportSubs}><Download size={16} className="mr-1" /> Baixar CSV</Button>
        </Card>
        <Card className="space-y-3 p-6">
          <h3>Agendamentos</h3>
          <p className="text-sm text-muted-foreground">Histórico de atendimentos.</p>
          <Button onClick={exportAppts}><Download size={16} className="mr-1" /> Baixar CSV</Button>
        </Card>
      </div>
    </div>
  );
}
