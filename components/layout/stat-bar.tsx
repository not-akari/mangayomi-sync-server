import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

// Labelled proportional bar for statistical distribution rendering.
export function StatBar({
  label,
  value,
  fraction,
  icon: Icon,
  barClassName = "bg-brand",
  className,
}: {
  label: string;
  value: string;
  /** 0 to 1. Clamped, so a bad ratio cannot overflow the track. */
  fraction: number;
  icon?: LucideIcon;
  /** Fill colour. Defaults to brand, overridden per item type. */
  barClassName?: string;
  className?: string;
}): React.ReactElement {
  const width = Math.round(Math.min(1, Math.max(0, fraction)) * 100);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex min-w-0 items-center gap-1.5 text-sm">
          {Icon && (
            <Icon
              className="size-4 shrink-0 self-center text-muted-foreground"
              aria-hidden="true"
            />
          )}
          <span className="truncate">{label}</span>
        </span>
        <span className="shrink-0 text-sm text-muted-foreground">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", barClassName)}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
