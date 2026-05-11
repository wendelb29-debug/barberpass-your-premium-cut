import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Scissors, Calendar, CreditCard, Sparkles, ArrowRight } from "lucide-react";
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
    <div className="min-h-screen bg-gradient-dark">
      {/* Nav */}
      <header className="border-b border-border/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo />
          <nav className="flex items-center gap-2">
            {user ? (
              <Button asChild variant="default" className="bg-gradient-gold text-primary-foreground">
                <Link to="/cliente">Meu painel</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost"><Link to="/login">Entrar</Link></Button>
                <Button asChild className="bg-gradient-gold text-primary-foreground hover:opacity-90">
                  <Link to="/cadastro">Cadastrar</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles size={14} /> Assinatura para quem vive bem cuidado
            </span>
            <h1 className="mt-5 text-5xl leading-tight md:text-6xl">
              Estilo impecável,<br />
              <span className="text-gradient-gold">todo mês.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              Assine o BarberPass e tenha cortes, barba e cuidados premium na sua barbearia favorita,
              com agendamento sem fricção e preço fechado.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" onClick={goSubscribe} className="bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-90">
                Ver planos <ArrowRight className="ml-1" size={18} />
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#como-funciona">Como funciona</a>
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-gold opacity-10 blur-3xl" />
            <div className="relative grid grid-cols-2 gap-4">
              <Stat icon={<Scissors size={20} />} value="+12k" label="Cortes por mês" />
              <Stat icon={<Calendar size={20} />} value="24/7" label="Agendamento" />
              <Stat icon={<CreditCard size={20} />} value="PIX" label="Pague como quiser" />
              <Stat icon={<Sparkles size={20} />} value="VIP" label="Atendimento premium" />
            </div>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section id="planos" className="mx-auto max-w-6xl px-6 py-16">
        <div className="text-center">
          <h2 className="text-4xl">Escolha seu plano</h2>
          <p className="mt-3 text-muted-foreground">Cancele quando quiser. Sem fidelidade.</p>
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
        <h2 className="text-center text-4xl">Em 3 passos</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <Step n={1} title="Escolha seu plano" desc="Pague no PIX, cartão ou boleto. Renova sozinho todo mês." />
          <Step n={2} title="Agende online" desc="Calendário em tempo real com horários livres do seu barbeiro." />
          <Step n={3} title="Apareça e relaxe" desc="Atendimento prioritário e visual sempre afiado." />
        </div>
      </section>

      <footer className="border-t border-border/50 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} BarberPass. Todos os direitos reservados.
      </footer>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-5 backdrop-blur">
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">{icon}</div>
      <div className="mt-3 text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-gold font-bold text-primary-foreground">{n}</div>
      <h3 className="mt-4 text-xl">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
