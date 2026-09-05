import { cn } from "@/lib/utils";

const WIDTHS = {
  narrow: "max-w-2xl",
  wide: "max-w-5xl",
  full: "max-w-7xl",
} as const;

export type PageWidth = keyof typeof WIDTHS;

export function PageShell({
  width = "narrow",
  className,
  children,
}: {
  width?: PageWidth;
  className?: string;
  children?: React.ReactNode;
}): React.ReactElement {
  return (
    <main
      className={cn(
        "mx-auto flex w-full flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10",
        WIDTHS[width],
        className,
      )}
    >
      {children}
    </main>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="flex flex-col gap-4 border-b pb-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="max-w-[65ch] text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {action}
      </div>
    </div>
  );
}
