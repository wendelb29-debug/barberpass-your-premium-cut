import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

export function PlanCard({
  name, price_cents, description, benefits, highlighted,
  ctaLabel = "Assinar plano", onSelect, loading,
}: PlanCardProps) {
  const price = (price_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return (
    <div
      className={cn(
        "relative flex flex-col gap-5 rounded-xl border bg-card p-6 transition-colors",
        highlighted
          ? "border-primary/40"
          : "border-border hover:border-border/80",
      )}
    >
      {highlighted && (
        <span className="absolute right-5 top-5 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
          Mais popular
        </span>
      )}
      <div>
        <h3 className="font-display text-[24px] font-semibold leading-tight">{name}</h3>
        {description && <p className="mt-1 text-[13px] text-muted-foreground">{description}</p>}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="tnum text-[32px] font-medium text-primary leading-none">{price}</span>
        <span className="text-[13px] text-muted-foreground">/mês</span>
      </div>
      <ul className="flex flex-col gap-2.5 text-[13px]">
        {benefits.map((b) => (
          <li key={b} className="flex items-start gap-2.5">
            <Check size={14} className="mt-0.5 shrink-0 text-primary" />
            <span className="text-foreground/90">{b}</span>
          </li>
        ))}
      </ul>
      <Button
        onClick={onSelect}
        disabled={loading}
        className={cn(
          "mt-auto h-11 rounded-[10px] transition-all duration-150",
          highlighted
            ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.01]"
            : "bg-secondary text-foreground hover:bg-secondary/80",
        )}
      >
        {loading ? "..." : ctaLabel}
      </Button>
    </div>
  );
}
