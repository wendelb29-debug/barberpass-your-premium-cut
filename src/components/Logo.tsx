import { Scissors } from "lucide-react";

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sz = size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-base";
  const ic = size === "lg" ? 18 : size === "sm" ? 12 : 14;
  const box = size === "lg" ? "h-9 w-9" : size === "sm" ? "h-6 w-6" : "h-7 w-7";
  return (
    <div className="flex items-center gap-2.5">
      <span className={`inline-flex ${box} items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary`}>
        <Scissors size={ic} strokeWidth={2.25} />
      </span>
      <span className={`font-display tracking-tight ${sz} font-semibold leading-none`}>
        Barber<span className="text-primary">Pass</span>
      </span>
    </div>
  );
}
