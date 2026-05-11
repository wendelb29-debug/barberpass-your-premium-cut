import { Scissors } from "lucide-react";

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sz = size === "lg" ? "text-3xl" : size === "sm" ? "text-base" : "text-xl";
  const ic = size === "lg" ? 28 : size === "sm" ? 16 : 20;
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-gradient-gold text-primary-foreground shadow-gold">
        <Scissors size={ic} strokeWidth={2.5} />
      </span>
      <span className={`font-display font-bold tracking-tight ${sz}`}>
        Barber<span className="text-gradient-gold">Pass</span>
      </span>
    </div>
  );
}
