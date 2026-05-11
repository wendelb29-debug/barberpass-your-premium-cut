import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PlanCard } from "@/components/PlanCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/cliente/planos")({ component: PlansPage });

function PlansPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  const { data: plans } = useQuery({
    queryKey: ["plans"],
    queryFn: async () => (await supabase.from("plans").select("*").eq("active", true).order("sort_order")).data ?? [],
  });
  const { data: sub } = useQuery({
    queryKey: ["my-subscription", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("subscriptions").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(1).maybeSingle()).data,
  });

  const subscribe = async (planId: string) => {
    if (!user) return;
    setBusy(planId);
    // If existing subscription, cancel it then create a new one (upgrade flow).
    if (sub && sub.status !== "CANCELLED") {
      await supabase.from("subscriptions").update({ status: "CANCELLED", cancelled_at: new Date().toISOString() }).eq("id", sub.id);
    }
    const next = new Date(); next.setMonth(next.getMonth() + 1);
    const { error } = await supabase.from("subscriptions").insert({
      user_id: user.id, plan_id: planId, status: "ACTIVE", billing_type: "PIX", next_due_date: next.toISOString().slice(0,10),
    });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Plano ativado! Pagamento será cobrado pelo Asaas.");
    qc.invalidateQueries({ queryKey: ["my-subscription"] });
  };

  const cancel = async () => {
    if (!sub) return;
    if (!confirm("Cancelar sua assinatura?")) return;
    await supabase.from("subscriptions").update({ status: "CANCELLED", cancelled_at: new Date().toISOString() }).eq("id", sub.id);
    toast.success("Assinatura cancelada.");
    qc.invalidateQueries({ queryKey: ["my-subscription"] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl">Planos</h1>
        <p className="text-muted-foreground">Escolha, faça upgrade ou cancele quando quiser.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {plans?.map((p, i) => (
          <PlanCard key={p.id} name={p.name} price_cents={p.price_cents} description={p.description} benefits={p.benefits}
            highlighted={i === 1}
            ctaLabel={sub?.plan_id === p.id && sub.status !== "CANCELLED" ? "Plano atual" : "Selecionar"}
            loading={busy === p.id}
            onSelect={() => sub?.plan_id !== p.id && subscribe(p.id)} />
        ))}
      </div>
      {sub && sub.status !== "CANCELLED" && (
        <Card className="flex items-center justify-between p-6">
          <div>
            <h3>Cancelar assinatura</h3>
            <p className="text-sm text-muted-foreground">Você pode reativar a qualquer momento.</p>
          </div>
          <Button variant="destructive" onClick={cancel}>Cancelar</Button>
        </Card>
      )}
    </div>
  );
}
