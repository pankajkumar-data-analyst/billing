import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type Tone = "default" | "success" | "warning" | "danger";

const TONES: Record<Tone, { value: string; iconBg: string; icon: string }> = {
  default: { value: "text-navy", iconBg: "bg-navy/5", icon: "text-navy" },
  success: { value: "text-emerald-600", iconBg: "bg-emerald-50", icon: "text-emerald-600" },
  warning: { value: "text-amber-600", iconBg: "bg-amber-50", icon: "text-amber-600" },
  danger: { value: "text-rose-600", iconBg: "bg-rose-50", icon: "text-rose-600" },
};

export function KpiCard({
  label,
  value,
  hint,
  href,
  tone = "default",
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
  tone?: Tone;
  icon?: LucideIcon;
}) {
  const t = TONES[tone];

  const body = (
    <Card className={cn("h-full transition-all", href && "hover:-translate-y-0.5 hover:shadow-card-hover")}>
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className={cn("mt-1.5 text-2xl font-bold leading-tight", t.value)}>{value}</p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        {Icon ? (
          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", t.iconBg)}>
            <Icon className={cn("h-5 w-5", t.icon)} strokeWidth={2} />
          </span>
        ) : null}
      </CardContent>
    </Card>
  );

  return href ? <Link href={href} className="block">{body}</Link> : body;
}
