import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { InitialsAvatar } from "@/components/Avatar";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/barbeiro/")({ component: BarberAgenda });

function BarberAgenda() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));

  const { data: barber } = useQuery({
    queryKey: ["barber-self", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("barbers").select("*").eq("user_id", user!.id).maybeSingle()).data,
  });

  const { data: appts, isLoading } = useQuery({
    queryKey: ["agenda", barber?.id, date],
    enabled: !!barber?.id,
    queryFn: async () => {
      const start = new Date(date + "T00:00:00").toISOString();
      const end = new Date(date + "T23:59:59").toISOString();
      const { data } = await supabase
        .from("appointments")
        .select("*, profiles!appointments_user_id_fkey(full_name, phone), plans(name)")
        .eq("barber_id", barber!.id)
        .gte("scheduled_at", start)
        .lte("scheduled_at", end)
        .order("scheduled_at");
      return data ?? [];
    },
  });

  const update = async (id: string, status: string) => {
    const patch: { status: string; completed_at?: string } = { status };
    if (status === "completed") patch.completed_at = new Date().toISOString();
    const { error } = await supabase.from("appointments").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Agendamento atualizado");
    qc.invalidateQueries({ queryKey: ["agenda"] });
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Agenda do dia"
        subtitle={barber?.full_name ?? "Barbeiro não vinculado ainda"}
        actions={
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-10 rounded-[8px] border border-border bg-input px-3 text-[13px] tnum"
          />
        }
      />

      {!barber && (
        <div className="rounded-xl border border-border bg-card p-6 text-[13px] text-muted-foreground">
          Sua conta de barbeiro ainda não está vinculada. Peça ao administrador para te cadastrar em "Painel admin → Barbeiros".
        </div>
      )}

      {isLoading && barber && <Skeleton className="h-[260px] w-full rounded-xl" />}

      {barber && !isLoading && (
        <div className="flex flex-col gap-3">
          {!appts?.length && (
            <div className="rounded-xl border border-border bg-card p-10 text-center text-[13px] text-muted-foreground">
              Sem agendamentos para este dia.
            </div>
          )}
          {appts?.map((a) => {
            const time = new Date(a.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
            const done = a.status === "completed" || a.status === "cancelled";
            const name = (a as any).profiles?.full_name ?? "Cliente";
            return (
              <div
                key={a.id}
                className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-border/80"
              >
                <div className="tnum w-16 text-[20px] font-medium leading-none">{time}</div>
                <InitialsAvatar name={name} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium leading-tight">{name}</p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    {a.service_type} · {(a as any).plans?.name ?? "Avulso"} · {(a as any).profiles?.phone ?? "—"}
                  </p>
                </div>
                <StatusBadge status={a.status} />
                {!done && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => update(a.id, "completed")}
                      className="h-8 rounded-[8px] bg-primary px-3 text-[12px] text-primary-foreground hover:bg-primary/90"
                    >
                      Concluir
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => update(a.id, "cancelled")}
                      className="h-8 rounded-[8px] border-border/60 bg-transparent px-3 text-[12px] hover:bg-white/5"
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
