import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Calendar, CreditCard, Crown, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { PlanCard } from "@/components/PlanCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: plans } = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data } = await supabase.from("plans").select("*").eq("active", true).order("sort_order");
      return data ?? [];
    },
  });

  const goSubscribe = () => {
    if (user) navigate({ to: "/cliente/planos" });
    else navigate({ to: "/cadastro" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo />
          <nav className="flex items-center gap-2">
            {user ? (
              <Button asChild className="h-10 rounded-[10px] bg-primary px-5 text-primary-foreground hover:bg-primary/90">
                <Link to="/cliente">Meu painel</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" className="h-10"><Link to="/login">Entrar</Link></Button>
                <Button asChild className="h-10 rounded-[10px] bg-primary px-5 text-primary-foreground hover:bg-primary/90">
                  <Link to="/cadastro">Começar agora</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[12px] text-muted-foreground">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              Sistema ao vivo
            </span>
            <h1 className="mt-6 font-display text-5xl font-semibold leading-[1.05] tracking-[-0.03em] md:text-7xl">
              Estilo impecável,<br />
              <span className="text-primary">todo mês.</span>
            </h1>
            <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
              Assine o BarberPass e tenha cortes, barba e cuidados premium na sua barbearia favorita,
              com agendamento sem fricção e preço fechado.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button onClick={goSubscribe} className="h-11 rounded-[10px] bg-primary px-6 text-primary-foreground transition-all duration-150 hover:bg-primary/90 hover:scale-[1.02]">
                Ver planos <ArrowRight size={16} />
              </Button>
              <Button asChild variant="outline" className="h-11 rounded-[10px] border-border/60 bg-transparent px-6 hover:bg-white/5">
                <a href="#planos">Como funciona</a>
              </Button>
            </div>
          </div>

          {/* Right: app mock cards */}
          <div className="relative">
            <div className="absolute -inset-6 rounded-3xl bg-primary/5 blur-3xl" />
            <div className="relative flex flex-col gap-3">
              <MockAppointmentCard />
              <MockPlanCard />
            </div>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section id="planos" className="mx-auto max-w-6xl px-6 py-16">
        <div className="text-center">
          <h2 className="font-display text-4xl font-semibold tracking-tight">Escolha seu plano</h2>
          <p className="mt-3 text-[14px] text-muted-foreground">Cancele quando quiser. Sem fidelidade.</p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {plans?.map((p, i) => (
            <PlanCard
              key={p.id}
              name={p.name}
              price_cents={p.price_cents}
              description={p.description}
              benefits={p.benefits}
              highlighted={i === 1}
              onSelect={goSubscribe}
            />
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center font-display text-4xl font-semibold tracking-tight">Em 3 passos</h2>
        <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-border/60 md:grid-cols-3">
          <Step icon={CreditCard} title="Escolha seu plano" desc="Pague no PIX, cartão ou boleto. Renova sozinho todo mês." />
          <Step icon={Calendar} title="Agende online" desc="Calendário em tempo real com horários livres do seu barbeiro." />
          <Step icon={Crown} title="Apareça e relaxe" desc="Atendimento prioritário e visual sempre afiado." />
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-[13px] text-muted-foreground">
        © {new Date().getFullYear()} BarberPass. Todos os direitos reservados.
      </footer>
    </div>
  );
}

function MockAppointmentCard() {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="label-eyebrow">Próximo agendamento</span>
        <Calendar size={14} className="text-muted-foreground/40" />
      </div>
      <p className="mt-3 tnum text-[24px] font-medium leading-none">Sex, 15 mai · 14:30</p>
      <p className="mt-2 text-[13px] text-muted-foreground">Corte + Barba</p>
      <div className="mt-4 flex items-center gap-2.5 border-t border-border/60 pt-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-[11px] font-semibold">RM</div>
        <div className="min-w-0">
          <p className="text-[13px] font-medium leading-tight">Ricardo Moraes</p>
          <p className="text-[11px] text-muted-foreground">Barbeiro sênior</p>
        </div>
        <span className="ml-auto rounded-full bg-[var(--status-success-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--status-success-fg)]">
          Confirmado
        </span>
      </div>
    </div>
  );
}

function MockPlanCard() {
  return (
    <div className="rounded-xl border border-primary/30 bg-card p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown size={14} className="text-primary" />
          <span className="label-eyebrow text-primary/80">Plano Premium</span>
        </div>
        <span className="rounded-full bg-[var(--status-success-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--status-success-fg)]">Ativo</span>
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="tnum text-[20px] font-medium text-primary">R$ 149</span>
        <span className="text-[12px] text-muted-foreground">/mês · próx. 12 jun</span>
      </div>
    </div>
  );
}

function Step({ icon: Icon, title, desc }: { icon: typeof Calendar; title: string; desc: string }) {
  return (
    <div className="bg-card p-8">
      <Icon size={24} className="text-muted-foreground" />
      <h3 className="mt-5 text-[16px] font-medium leading-tight">{title}</h3>
      <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  );
}
