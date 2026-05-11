import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, CreditCard, Crown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cliente/")({ component: MyPlan });

function statusColor(s: string) {
  if (s === "ACTIVE" || s === "ATIVA") return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  if (s === "OVERDUE" || s === "INADIMPLENTE") return "bg-amber-500/15 text-amber-400 border-amber-500/30";
  if (s === "CANCELLED" || s === "CANCELADA") return "bg-red-500/15 text-red-400 border-red-500/30";
  return "bg-muted text-muted-foreground";
}

function MyPlan() {
  const { user } = useAuth();
  const { data: sub } = useQuery({
    queryKey: ["my-subscription", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("*, plans(*)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: lastPayment } = useQuery({
    queryKey: ["last-payment", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  if (!sub) {
    return (
      <Card className="p-10 text-center">
        <Crown className="mx-auto text-primary" size={40} />
        <h2 className="mt-4 text-2xl">Você ainda não tem um plano</h2>
        <p className="mt-2 text-muted-foreground">Escolha um plano para começar a aproveitar.</p>
        <Button asChild className="mt-6 bg-gradient-gold text-primary-foreground"><Link to="/cliente/planos">Ver planos</Link></Button>
      </Card>
    );
  }

  const next = sub.next_due_date ? new Date(sub.next_due_date).toLocaleDateString("pt-BR") : "—";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl">Meu plano</h1>
        <p className="text-muted-foreground">Gerencie sua assinatura BarberPass.</p>
      </div>

      <Card className="overflow-hidden border-primary/30 p-0">
        <div className="bg-gradient-gold p-6 text-primary-foreground">
          <div className="flex items-center gap-2 text-sm opacity-80"><Crown size={16}/> Plano atual</div>
          <div className="mt-1 font-display text-3xl">{sub.plans?.name}</div>
          <div className="mt-1 text-sm opacity-90">{((sub.plans?.price_cents ?? 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} / mês</div>
        </div>
        <div className="grid gap-4 p-6 md:grid-cols-3">
          <Info icon={<Badge className={statusColor(sub.status)}>{sub.status}</Badge>} label="Status da assinatura" />
          <Info icon={<div className="text-lg font-semibold">{next}</div>} label="Próximo vencimento" />
          <Info
            icon={<Badge className={statusColor(lastPayment?.status ?? "PENDING")}>{lastPayment?.status ?? "—"}</Badge>}
            label="Último pagamento"
          />
        </div>
        <div className="flex flex-wrap gap-3 border-t border-border p-6">
          <Button asChild className="bg-gradient-gold text-primary-foreground"><Link to="/cliente/agendar"><Calendar size={16} className="mr-1"/>Agendar</Link></Button>
          <Button asChild variant="outline"><Link to="/cliente/planos">Mudar plano</Link></Button>
          {lastPayment?.invoice_url && (
            <Button asChild variant="outline">
              <a href={lastPayment.invoice_url} target="_blank" rel="noreferrer"><CreditCard size={16} className="mr-1"/>Ver fatura</a>
            </Button>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg">Benefícios do seu plano</h3>
        <ul className="mt-4 space-y-2 text-sm">
          {sub.plans?.benefits?.map((b: string) => (<li key={b}>• {b}</li>))}
        </ul>
      </Card>
    </div>
  );
}

function Info({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-2">{icon}</div>
    </div>
  );
}
