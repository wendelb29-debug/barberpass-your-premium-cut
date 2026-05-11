import { cn } from "@/lib/utils";

export function initialsOf(name?: string | null) {
  if (!name) return "—";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "·";
}

export function InitialsAvatar({
  name,
  size = 28,
  className,
}: {
  name?: string | null;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-foreground",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {initialsOf(name)}
    </div>
  );
}
