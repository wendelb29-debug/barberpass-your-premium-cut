import type { ComponentType, ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MetricCardProps {
  label: string;
  value: ReactNode;
  delta?: { value: number; suffix?: string } | null;
  icon?: ComponentType<{ size?: number; className?: string }>;
  className?: string;
}

export function MetricCard({ label, value, delta, icon: Icon, className }: MetricCardProps) {
  const positive = (delta?.value ?? 0) >= 0;
  return (
    <div
      className={cn(
        "relative rounded-xl border border-border bg-card p-5 transition-colors hover:border-border/80",
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <span className="label-eyebrow">{label}</span>
        {Icon && <Icon size={14} className="text-muted-foreground/40" />}
      </div>
      <div className="mt-3 tnum text-[28px] font-medium leading-none animate-in fade-in duration-300">
        {value}
      </div>
      {delta && (
        <div className="mt-2 flex items-center gap-1 text-[12px] tnum">
          {positive ? (
            <ArrowUpRight size={12} className="text-emerald-400" />
          ) : (
            <ArrowDownRight size={12} className="text-red-400" />
          )}
          <span className={positive ? "text-emerald-400" : "text-red-400"}>
            {Math.abs(delta.value)}%
          </span>
          <span className="text-muted-foreground">{delta.suffix ?? "vs mês anterior"}</span>
        </div>
      )}
    </div>
  );
}
