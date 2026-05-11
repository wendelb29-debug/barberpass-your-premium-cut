import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/clientes")({ component: AdminClients });

function AdminClients() {
  const { data } = useQuery({
    queryKey: ["admin-clients"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, phone, created_at, subscriptions(status, plans(name, price_cents))")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl">Clientes</h1>
        <p className="text-muted-foreground">Todos os usuários cadastrados.</p>
      </div>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-background/50">
            <tr className="text-left">
              <th className="px-4 py-3">Nome</th><th className="px-4 py-3">Telefone</th>
              <th className="px-4 py-3">Plano</th><th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Cadastro</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((c: any) => {
              const sub = c.subscriptions?.[0];
              return (
                <tr key={c.id} className="border-b border-border/50">
                  <td className="px-4 py-3 font-medium">{c.full_name || "—"}</td>
                  <td className="px-4 py-3">{c.phone || "—"}</td>
                  <td className="px-4 py-3">{sub?.plans?.name ?? "—"}</td>
                  <td className="px-4 py-3">{sub ? <Badge variant="outline">{sub.status}</Badge> : "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(c.created_at).toLocaleDateString("pt-BR")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
