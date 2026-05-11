import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, CreditCard, Crown, Check } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { StatusBadge, Tag } from "@/components/StatusBadge";

export const Route = createFileRoute("/_authenticated/cliente/")({ component: MyPlan });

function MyPlan() {
  const { user } = useAuth();
  const { data: sub, isLoading } = useQuery({
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

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title="Meu plano" subtitle="Gerencie sua assinatura BarberPass." />
        <Skeleton className="h-[260px] w-full rounded-xl" />
      </div>
    );
  }

  if (!sub) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title="Meu plano" subtitle="Gerencie sua assinatura BarberPass." />
        <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-12 text-center">
          <Crown className="text-primary" size={32} />
          <div>
            <h2 className="text-[20px] font-medium">Você ainda não tem um plano</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">Escolha um plano para começar a aproveitar.</p>
          </div>
          <Button asChild className="h-11 rounded-[10px] bg-primary px-6 text-primary-foreground hover:bg-primary/90">
            <Link to="/cliente/planos">Ver planos</Link>
          </Button>
        </div>
      </div>
    );
  }

  const next = sub.next_due_date ? new Date(sub.next_due_date).toLocaleDateString("pt-BR") : "—";
  const lastPaid = lastPayment?.paid_at
    ? new Date(lastPayment.paid_at).toLocaleDateString("pt-BR")
    : "—";
  const price = ((sub.plans?.price_cents ?? 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Meu plano" subtitle="Gerencie sua assinatura BarberPass." />

      <div className="rounded-xl border border-primary/35 bg-card p-6 animate-in fade-in duration-300">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Crown size={14} className="text-primary" />
              <span className="label-eyebrow text-primary/80">Plano atual</span>
            </div>
            <h2 className="mt-2 font-display text-[24px] font-semibold leading-tight">{sub.plans?.name}</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              <span className="tnum text-foreground/80">{price}</span> / mês
            </p>
          </div>
          <Tag tone="success">Plano ativo</Tag>
        </div>

        <div className="mt-6 grid gap-5 border-t border-border/50 pt-5 sm:grid-cols-3">
          <Cell label="Status">
            <StatusBadge status={sub.status} />
          </Cell>
          <Cell label="Próx. vencimento">
            <span className="tnum text-[15px] font-medium">{next}</span>
          </Cell>
          <Cell label="Último pagamento">
            <div className="flex items-center gap-2">
              <StatusBadge status={lastPayment?.status ?? "PENDING"} />
              {lastPaid !== "—" && <span className="tnum text-[12px] text-muted-foreground">{lastPaid}</span>}
            </div>
          </Cell>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border/50 pt-5">
          <Button asChild className="h-10 rounded-[10px] bg-primary px-4 text-primary-foreground hover:bg-primary/90">
            <Link to="/cliente/agendar"><Calendar size={14} className="mr-1.5" />Agendar</Link>
          </Button>
          <Button asChild variant="outline" className="h-10 rounded-[10px] border-border/60 bg-transparent hover:bg-white/5">
            <Link to="/cliente/planos">Mudar plano</Link>
          </Button>
          {lastPayment?.invoice_url && (
            <Button asChild variant="ghost" className="h-10 rounded-[10px] hover:bg-white/5">
              <a href={lastPayment.invoice_url} target="_blank" rel="noreferrer">
                <CreditCard size={14} className="mr-1.5" />Ver fatura
              </a>
            </Button>
          )}
        </div>
      </div>

      <section className="flex flex-col gap-4">
        <h3 className="text-[15px] font-medium tracking-tight">Benefícios do seu plano</h3>
        <div className="rounded-xl border border-border bg-card p-5">
          <ul className="flex flex-col gap-2.5 text-[13px]">
            {sub.plans?.benefits?.map((b: string) => (
              <li key={b} className="flex items-start gap-2.5">
                <Check size={14} className="mt-0.5 shrink-0 text-primary" />
                <span className="text-foreground/90">{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="label-eyebrow">{label}</span>
      <div>{children}</div>
    </div>
  );
}
