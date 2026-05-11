import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/cliente/historico")({ component: History });

function History() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["history", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase
      .from("appointments")
      .select("*, barbers(full_name), plans(name)")
      .eq("user_id", user!.id)
      .order("scheduled_at", { ascending: false })).data ?? [],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl">Histórico</h1>
        <p className="text-muted-foreground">Seus atendimentos.</p>
      </div>
      <Card className="divide-y divide-border p-0">
        {!data?.length && <div className="p-8 text-center text-muted-foreground">Nenhum atendimento ainda.</div>}
        {data?.map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-4 p-4">
            <div>
              <div className="font-medium">{new Date(a.scheduled_at).toLocaleString("pt-BR")}</div>
              <div className="text-sm text-muted-foreground">
                {a.barbers?.full_name ?? "—"} • {a.service_type} • {a.plans?.name ?? "Avulso"}
              </div>
            </div>
            <Badge variant="outline">{a.status}</Badge>
          </div>
        ))}
      </Card>
    </div>
  );
}
