"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SelectionToolbar({
  count,
  label,
  onClear,
  clearLabel,
  children,
  className,
}: {
  count: number;
  /** Text like "3 selected". Should already include the count. */
  label: string;
  onClear: () => void;
  clearLabel: string;
  children: React.ReactNode;
  className?: string;
}): React.ReactElement | null {
  if (count === 0) return null;
  return (
    <div
      className={cn(
        "sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-sm",
        className,
      )}
    >
      <span className="text-sm font-medium">{label}</span>
      <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClear}
        aria-label={clearLabel}
        className="ml-auto"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
