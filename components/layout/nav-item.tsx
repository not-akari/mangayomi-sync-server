"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function NavItem({
  href,
  label,
  icon: Icon,
  active,
  variant,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
  variant: "rail" | "bottom";
}): React.ReactElement {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-col items-center gap-1 rounded-lg py-2 text-[11px] transition-colors",
        variant === "rail" ? "px-1" : "flex-1 px-2",
        active
          ? "bg-accent font-medium text-accent-foreground"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
      )}
    >
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      <span className="max-w-full truncate">{label}</span>
    </Link>
  );
}
