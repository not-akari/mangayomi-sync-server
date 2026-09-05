"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Settings group card with divided rows.
export function SettingsGroup({
  title,
  description,
  action,
  className,
  children,
}: {
  /** Optional — omit when the surrounding UI (a tab, a page header) already names the group. */
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}): React.ReactElement {
  const hasHeader = Boolean(title || description || action);
  return (
    <Card className={cn("gap-0", className)}>
      {hasHeader && (
        <CardHeader className="border-b">
          {title && <CardTitle>{title}</CardTitle>}
          {description && (
            <CardDescription className="max-w-[65ch]">
              {description}
            </CardDescription>
          )}
          {action && <CardAction>{action}</CardAction>}
        </CardHeader>
      )}
      <CardContent className="divide-y px-0">{children}</CardContent>
    </Card>
  );
}

// Titled block of divided rows for use inside an existing panel surface.
export function SettingsBlock({
  title,
  description,
  action,
  className,
  collapsible = false,
  defaultOpen = true,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
}): React.ReactElement {
  const [open, setOpen] = useState(defaultOpen);
  const shown = !collapsible || open;
  const headerBody = (
    <>
      <div className="min-w-0">
        <h3 className="text-sm font-medium">{title}</h3>
        {description && (
          <p className="max-w-[65ch] text-xs text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {(action || collapsible) && (
        <div className="flex shrink-0 items-center gap-2">
          {action}
          {collapsible && (
            <ChevronDown
              aria-hidden="true"
              className={cn(
                "size-4 text-muted-foreground transition-transform",
                open && "rotate-180",
              )}
            />
          )}
        </div>
      )}
    </>
  );
  return (
    <section className={cn("overflow-hidden rounded-lg border", className)}>
      {collapsible ? (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-start justify-between gap-4 border-b bg-muted/40 px-4 py-2.5 text-left transition-colors hover:bg-muted/60"
        >
          {headerBody}
        </button>
      ) : (
        <header className="flex items-start justify-between gap-4 border-b bg-muted/40 px-4 py-2.5">
          {headerBody}
        </header>
      )}
      {shown && <div className="divide-y">{children}</div>}
    </section>
  );
}

// Shared Label/description shell for a single settings field.
export function SettingRow({
  htmlFor,
  label,
  description,
  layout = "row",
  destructive,
  className,
  children,
}: {
  htmlFor?: string;
  label: string;
  description?: string;
  layout?: "row" | "column";
  destructive?: boolean;
  className?: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 px-(--card-spacing) py-3",
        layout === "row" &&
          "sm:flex-row sm:items-center sm:justify-between sm:gap-4",
        className,
      )}
    >
      <div className="min-w-0">
        <Label htmlFor={htmlFor} className={destructive ? "text-destructive" : undefined}>
          {label}
        </Label>
        {description && (
          <p className="max-w-[65ch] text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}
