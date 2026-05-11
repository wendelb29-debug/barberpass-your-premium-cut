import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { DataTable, TH, THead, TBody, TR, TD, EmptyRow } from "@/components/DataTable";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/cliente/historico")({ component: History });

function History() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["history", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase
      .from("appointments")
      .select("*, barbers(full_name), plans(name)")
      .eq("user_id", user!.id)
      .order("scheduled_at", { ascending: false })).data ?? [],
  });

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Histórico" subtitle="Seus atendimentos passados e futuros." />
      {isLoading ? (
        <Skeleton className="h-[260px] w-full rounded-xl" />
      ) : (
        <DataTable>
          <THead>
            <TH>Data e hora</TH>
            <TH>Barbeiro</TH>
            <TH>Serviço</TH>
            <TH>Plano</TH>
            <TH>Status</TH>
          </THead>
          <TBody>
            {!data?.length && <EmptyRow colSpan={5}>Nenhum atendimento ainda.</EmptyRow>}
            {data?.map((a) => (
              <TR key={a.id}>
                <TD className="tnum font-medium">
                  {new Date(a.scheduled_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                </TD>
                <TD className="text-muted-foreground">{(a as any).barbers?.full_name ?? "—"}</TD>
                <TD className="text-muted-foreground">{a.service_type}</TD>
                <TD className="text-muted-foreground">{(a as any).plans?.name ?? "Avulso"}</TD>
                <TD><StatusBadge status={a.status} /></TD>
              </TR>
            ))}
          </TBody>
        </DataTable>
      )}
    </div>
  );
}
