import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export interface PlanCardProps {
  name: string;
  price_cents: number;
  description?: string | null;
  benefits: string[];
  highlighted?: boolean;
  ctaLabel?: string;
  onSelect?: () => void;
  loading?: boolean;
}

export function PlanCard({ name, price_cents, description, benefits, highlighted, ctaLabel = "Assinar plano", onSelect, loading }: PlanCardProps) {
  const price = (price_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return (
    <Card className={`relative flex flex-col gap-6 p-7 transition-all ${highlighted ? "border-primary shadow-gold scale-[1.02]" : "border-border hover:border-primary/40"}`}>
      {highlighted && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-gold px-3 py-1 text-xs font-semibold text-primary-foreground">
          Mais popular
        </span>
      )}
      <div>
        <h3 className="font-display text-2xl">{name}</h3>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-4xl font-bold">{price}</span>
        <span className="text-sm text-muted-foreground">/mês</span>
      </div>
      <ul className="space-y-2.5 text-sm">
        {benefits.map((b) => (
          <li key={b} className="flex items-start gap-2">
            <Check size={16} className="mt-0.5 shrink-0 text-primary" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <Button onClick={onSelect} disabled={loading} className={`mt-auto ${highlighted ? "bg-gradient-gold text-primary-foreground hover:opacity-90" : ""}`}>
        {loading ? "..." : ctaLabel}
      </Button>
    </Card>
  );
}
