"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavTab {
  key: string;
  label: string;
  icon: LucideIcon;
  danger?: boolean;
}

function tabTone(isActive: boolean, danger?: boolean): string {
  if (isActive) {
    return danger
      ? "bg-destructive/10 font-medium text-destructive"
      : "bg-accent font-medium text-accent-foreground";
  }
  return danger
    ? "text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground";
}

// Responsive tab list supporting horizontal and vertical orientations.
export function NavTabs({
  tabs,
  active,
  onSelect,
  orientation = "horizontal",
  label,
}: {
  tabs: NavTab[];
  active: string;
  onSelect: (key: string) => void;
  orientation?: "horizontal" | "vertical";
  label?: string;
}): React.ReactElement {
  const vertical = orientation === "vertical";

  return (
    <nav
      role="tablist"
      aria-label={label}
      aria-orientation={orientation}
      className={cn(
        vertical
          ? "flex flex-col gap-0.5"
          : "no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0",
      )}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(tab.key)}
            className={cn(
              "flex shrink-0 items-center rounded-md transition-colors",
              vertical
                ? "gap-2.5 px-3 py-2 text-left text-sm"
                : "gap-1.5 px-3 py-1.5 text-sm",
              tabTone(isActive, tab.danger),
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            <span className={vertical ? "truncate" : undefined}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

// Sidebar layout on desktop and tab strip on mobile.
export function TabLayout({
  tabs,
  active,
  onSelect,
  label,
  children,
}: {
  tabs: NavTab[];
  active: string;
  onSelect: (key: string) => void;
  label?: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
      <aside className="hidden lg:block lg:w-56 lg:shrink-0">
        <div className="sticky top-8">
          <NavTabs
            tabs={tabs}
            active={active}
            onSelect={onSelect}
            orientation="vertical"
            label={label}
          />
        </div>
      </aside>
      <div className="lg:hidden">
        <NavTabs tabs={tabs} active={active} onSelect={onSelect} label={label} />
      </div>
      <div className="min-w-0 flex-1 space-y-6">{children}</div>
    </div>
  );
}
