import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

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

  const { data: appts } = useQuery({
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
    toast.success("Atualizado!");
    qc.invalidateQueries({ queryKey: ["agenda"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl">Agenda</h1>
          <p className="text-muted-foreground">{barber?.full_name ?? "Barbeiro não vinculado ainda"}</p>
        </div>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="h-9 rounded-md border border-input bg-input/30 px-3 text-sm" />
      </div>

      {!barber && (
        <Card className="p-6 text-sm text-muted-foreground">
          Sua conta de barbeiro ainda não está vinculada. Peça ao administrador para te cadastrar em "Painel admin → Barbeiros".
        </Card>
      )}

      <Card className="divide-y divide-border p-0">
        {!appts?.length && barber && (
          <div className="p-8 text-center text-muted-foreground">Sem agendamentos para este dia.</div>
        )}
        {appts?.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
            <div>
              <div className="text-lg font-semibold">{new Date(a.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
              <div className="text-sm">{(a as any).profiles?.full_name ?? "Cliente"}</div>
              <div className="text-xs text-muted-foreground">{a.service_type} • {(a as any).plans?.name ?? "Avulso"} • {(a as any).profiles?.phone}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{a.status}</Badge>
              {a.status !== "completed" && a.status !== "cancelled" && (
                <>
                  <Button size="sm" onClick={() => update(a.id, "completed")} className="bg-gradient-gold text-primary-foreground">Concluir</Button>
                  <Button size="sm" variant="outline" onClick={() => update(a.id, "cancelled")}>Cancelar</Button>
                </>
              )}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
