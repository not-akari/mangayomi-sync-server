"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Chevron-toggle disclosure button used by collapsible lists.
export function CollapsibleTrigger({
  open,
  onToggle,
  className,
  children,
  ...props
}: {
  open: boolean;
  onToggle: () => void;
} & Omit<React.ComponentProps<"button">, "onToggle">): React.ReactElement {
  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={onToggle}
      className={cn(
        "flex w-full items-center justify-between gap-4 text-left transition-colors hover:bg-accent",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronDown
        aria-hidden="true"
        className={cn(
          "size-4 shrink-0 text-muted-foreground transition-transform",
          open && "rotate-180",
        )}
      />
    </button>
  );
}
