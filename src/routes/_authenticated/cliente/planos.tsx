import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PlanCard } from "@/components/PlanCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useState } from "react";
import { subscribeToPlan, cancelMySubscription } from "@/lib/subscriptions.functions";

export const Route = createFileRoute("/_authenticated/cliente/planos")({ component: PlansPage });

function PlansPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const subscribe = useServerFn(subscribeToPlan);
  const cancelSub = useServerFn(cancelMySubscription);
  const [open, setOpen] = useState<string | null>(null);
  const [billing, setBilling] = useState<"PIX" | "CREDIT_CARD" | "BOLETO">("PIX");
  const [cpf, setCpf] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: plans } = useQuery({
    queryKey: ["plans"],
    queryFn: async () => (await supabase.from("plans").select("*").eq("active", true).order("sort_order")).data ?? [],
  });
  const { data: sub } = useQuery({
    queryKey: ["my-subscription", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("subscriptions").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(1).maybeSingle()).data,
  });

  const confirmSubscribe = async () => {
    if (!open) return;
    setBusy(true);
    try {
      await subscribe({ data: { planId: open, billingType: billing, cpfCnpj: cpf || undefined } });
      toast.success("Assinatura criada! Confira sua fatura no painel.");
      setOpen(null); setCpf("");
      qc.invalidateQueries({ queryKey: ["my-subscription"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Falha ao assinar");
    } finally { setBusy(false); }
  };

  const cancel = async () => {
    if (!confirm("Cancelar sua assinatura?")) return;
    try {
      await cancelSub({});
      toast.success("Assinatura cancelada.");
      qc.invalidateQueries({ queryKey: ["my-subscription"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Falha");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-[32px] font-semibold leading-tight tracking-tight md:text-[40px]">Planos</h1>
        <p className="mt-1 text-[14px] text-muted-foreground">Escolha, faça upgrade ou cancele quando quiser.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {plans?.map((p, i) => (
          <PlanCard key={p.id} name={p.name} price_cents={p.price_cents} description={p.description} benefits={p.benefits}
            highlighted={i === 1}
            ctaLabel={sub?.plan_id === p.id && sub.status !== "CANCELLED" ? "Plano atual" : "Selecionar"}
            onSelect={() => sub?.plan_id !== p.id && setOpen(p.id)} />
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

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Forma de pagamento</DialogTitle></DialogHeader>
          <RadioGroup value={billing} onValueChange={(v) => setBilling(v as any)} className="space-y-2">
            {(["PIX","CREDIT_CARD","BOLETO"] as const).map((b) => (
              <div key={b} className="flex items-center gap-2 rounded border border-border p-3">
                <RadioGroupItem value={b} id={b} />
                <Label htmlFor={b} className="cursor-pointer">{b === "PIX" ? "PIX" : b === "CREDIT_CARD" ? "Cartão de crédito" : "Boleto"}</Label>
              </div>
            ))}
          </RadioGroup>
          <div className="space-y-2">
            <Label htmlFor="cpf">CPF / CNPJ (necessário para gerar a primeira cobrança)</Label>
            <Input id="cpf" value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(null)}>Voltar</Button>
            <Button disabled={busy} onClick={confirmSubscribe} className="h-10 rounded-[10px] bg-primary px-5 text-primary-foreground hover:bg-primary/90">
              {busy ? "Processando..." : "Confirmar assinatura"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
