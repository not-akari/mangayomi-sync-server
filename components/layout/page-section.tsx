import { cn } from "@/lib/utils";

// Titled section with optional description and header actions.
export function PageSection({
  title,
  description,
  headerExtra,
  className,
  children,
}: {
  /** Omitted when something else already names the section, such as a selected tab. */
  title?: string;
  description?: string;
  headerExtra?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <section className={cn("flex flex-col gap-3", className)}>
      {(title || headerExtra) && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          {title && <h2 className="text-lg font-semibold">{title}</h2>}
          {headerExtra}
        </div>
      )}
      {description && (
        <p className="max-w-[65ch] text-sm text-muted-foreground">
          {description}
        </p>
      )}
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

// Divided row container for clean scannable lists.
export function ListRows({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div
      className={cn(
        "divide-y overflow-hidden rounded-lg border bg-card",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ListRow({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}): React.ReactElement {
  return <div className={cn("px-4 py-3", className)}>{children}</div>;
}
