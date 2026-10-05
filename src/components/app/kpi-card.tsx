import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  hint,
  href,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const color = {
    default: "text-navy",
    success: "text-green-700",
    warning: "text-amber-700",
    danger: "text-red-700",
  }[tone];

  const body = (
    <Card className={cn(href && "transition-shadow hover:shadow-md")}>
      <CardContent className="pt-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={cn("mt-1 text-2xl font-bold", color)}>{value}</p>
        {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{body}</Link> : body;
}
