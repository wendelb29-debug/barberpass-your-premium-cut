import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { InitialsAvatar } from "@/components/Avatar";
import { DataTable, TH, THead, TBody, TR, TD, EmptyRow } from "@/components/DataTable";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/admin/clientes")({ component: AdminClients });

function AdminClients() {
  const { data, isLoading } = useQuery({
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
    <div className="flex flex-col gap-8">
      <PageHeader title="Clientes" subtitle="Todos os usuários cadastrados." />
      {isLoading ? (
        <Skeleton className="h-[300px] w-full rounded-xl" />
      ) : (
        <DataTable>
          <THead>
            <TH>Nome</TH>
            <TH>Telefone</TH>
            <TH>Plano</TH>
            <TH>Status</TH>
            <TH>Cadastro</TH>
          </THead>
          <TBody>
            {!data?.length && <EmptyRow colSpan={5}>Nenhum cliente ainda.</EmptyRow>}
            {data?.map((c: any) => {
              const sub = c.subscriptions?.[0];
              return (
                <TR key={c.id}>
                  <TD>
                    <div className="flex items-center gap-2.5">
                      <InitialsAvatar name={c.full_name} />
                      <span className="font-medium">{c.full_name || "—"}</span>
                    </div>
                  </TD>
                  <TD className="tnum text-muted-foreground">{c.phone || "—"}</TD>
                  <TD className="text-muted-foreground">{sub?.plans?.name ?? "—"}</TD>
                  <TD>{sub ? <StatusBadge status={sub.status} /> : <span className="text-muted-foreground">—</span>}</TD>
                  <TD className="tnum text-muted-foreground">{new Date(c.created_at).toLocaleDateString("pt-BR")}</TD>
                </TR>
              );
            })}
          </TBody>
        </DataTable>
      )}
    </div>
  );
}
