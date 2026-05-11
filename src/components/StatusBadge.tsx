import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "danger" | "info" | "overdue" | "neutral";

const STATUS_MAP: Record<string, { label: string; tone: Tone }> = {
  ACTIVE: { label: "Ativo", tone: "success" },
  CONFIRMED: { label: "Confirmado", tone: "success" },
  COMPLETED: { label: "Concluído", tone: "success" },
  PAID: { label: "Pago", tone: "success" },
  RECEIVED: { label: "Pago", tone: "success" },
  PENDING: { label: "Pendente", tone: "warning" },
  SCHEDULED: { label: "Agendado", tone: "info" },
  OVERDUE: { label: "Inadimplente", tone: "overdue" },
  CANCELLED: { label: "Cancelado", tone: "danger" },
  CANCELED: { label: "Cancelado", tone: "danger" },
  REFUNDED: { label: "Reembolsado", tone: "neutral" },
  // PT-BR fallback
  ATIVA: { label: "Ativo", tone: "success" },
  ATIVO: { label: "Ativo", tone: "success" },
  INADIMPLENTE: { label: "Inadimplente", tone: "overdue" },
  CANCELADA: { label: "Cancelado", tone: "danger" },
  CANCELADO: { label: "Cancelado", tone: "danger" },
  CONCLUIDO: { label: "Concluído", tone: "success" },
  CONFIRMADO: { label: "Confirmado", tone: "success" },
  PENDENTE: { label: "Pendente", tone: "warning" },
};

const TONE_CLASS: Record<Tone, string> = {
  success: "bg-[var(--status-success-bg)] text-[var(--status-success-fg)]",
  warning: "bg-[var(--status-warning-bg)] text-[var(--status-warning-fg)]",
  danger: "bg-[var(--status-danger-bg)] text-[var(--status-danger-fg)]",
  info: "bg-[var(--status-info-bg)] text-[var(--status-info-fg)]",
  overdue: "bg-[var(--status-overdue-bg)] text-[var(--status-overdue-fg)]",
  neutral: "bg-[var(--status-neutral-bg)] text-[var(--status-neutral-fg)]",
};

export function StatusBadge({ status, className }: { status: string | null | undefined; className?: string }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  const key = String(status).toUpperCase();
  const def = STATUS_MAP[key] ?? { label: key.charAt(0) + key.slice(1).toLowerCase(), tone: "neutral" as Tone };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium leading-tight",
        TONE_CLASS[def.tone],
        className,
      )}
    >
      {def.label}
    </span>
  );
}

export function Tag({ tone = "neutral", children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
