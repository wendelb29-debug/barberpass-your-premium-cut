import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/cliente/agendar")({ component: Schedule });

function Schedule() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const today = new Date();
  const [date, setDate] = useState<string>(today.toISOString().slice(0, 10));
  const [barberId, setBarberId] = useState<string>("");
  const [service, setService] = useState<string>("haircut");
  const [busy, setBusy] = useState(false);

  const { data: barbers } = useQuery({
    queryKey: ["barbers"],
    queryFn: async () => (await supabase.from("barbers").select("*").eq("active", true)).data ?? [],
  });

  const { data: sub } = useQuery({
    queryKey: ["my-subscription", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("subscriptions").select("*, plans(*)").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(1).maybeSingle()).data,
  });

  const { data: takenSlots } = useQuery({
    queryKey: ["taken", barberId, date],
    enabled: !!barberId && !!date,
    queryFn: async () => {
      const start = new Date(date + "T00:00:00").toISOString();
      const end = new Date(date + "T23:59:59").toISOString();
      const { data } = await supabase.from("appointments").select("scheduled_at").eq("barber_id", barberId).gte("scheduled_at", start).lte("scheduled_at", end).neq("status", "cancelled");
      return (data ?? []).map((r) => new Date(r.scheduled_at).toISOString());
    },
  });

  const slots = useMemo(() => {
    const out: string[] = [];
    for (let h = 9; h < 19; h++) {
      out.push(`${String(h).padStart(2, "0")}:00`);
      out.push(`${String(h).padStart(2, "0")}:30`);
    }
    return out;
  }, []);

  const isTaken = (t: string) => {
    const iso = new Date(`${date}T${t}:00`).toISOString();
    return takenSlots?.includes(iso);
  };

  const book = async (t: string) => {
    if (!user || !barberId) { toast.error("Selecione o barbeiro"); return; }
    if (!sub || sub.status === "CANCELLED") { toast.error("Assine um plano para agendar"); return; }
    setBusy(true);
    const scheduled_at = new Date(`${date}T${t}:00`).toISOString();
    const { error } = await supabase.from("appointments").insert({
      user_id: user.id, barber_id: barberId, plan_id: sub.plan_id, scheduled_at, service_type: service,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Horário reservado!");
    qc.invalidateQueries({ queryKey: ["taken"] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl">Agendar atendimento</h1>
        <p className="text-muted-foreground">Escolha barbeiro, dia e horário.</p>
      </div>
      <Card className="grid gap-4 p-6 md:grid-cols-3">
        <div>
          <label className="text-xs text-muted-foreground">Barbeiro</label>
          <Select value={barberId} onValueChange={setBarberId}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {barbers?.map((b) => <SelectItem key={b.id} value={b.id}>{b.full_name}</SelectItem>)}
              {!barbers?.length && <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum barbeiro cadastrado</div>}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Data</label>
          <input type="date" value={date} min={today.toISOString().slice(0,10)} onChange={(e) => setDate(e.target.value)}
            className="mt-1 flex h-9 w-full rounded-md border border-input bg-input/30 px-3 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Serviço</label>
          <Select value={service} onValueChange={setService}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="haircut">Corte de cabelo</SelectItem>
              <SelectItem value="beard">Barba</SelectItem>
              <SelectItem value="combo">Corte + Barba</SelectItem>
              <SelectItem value="treatment">Hidratação</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg">Horários disponíveis</h3>
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6">
          {slots.map((t) => {
            const taken = isTaken(t);
            return (
              <Button key={t} variant={taken ? "ghost" : "outline"} disabled={taken || busy || !barberId}
                onClick={() => book(t)}
                className={taken ? "line-through opacity-50" : "hover:border-primary hover:text-primary"}>
                {t}
              </Button>
            );
          })}
        </div>
        {!barberId && <p className="mt-4 text-sm text-muted-foreground">Selecione um barbeiro para ver os horários.</p>}
      </Card>
    </div>
  );
}
