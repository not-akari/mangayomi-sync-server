import { cn } from "@/lib/utils";

// Native select styled to match Input.
function Select({
  className,
  ...props
}: React.ComponentProps<"select">): React.ReactElement {
  return (
    <select
      data-slot="select"
      className={cn(
        "h-8 rounded-lg border border-input bg-background px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

function SelectOption({
  className,
  ...props
}: React.ComponentProps<"option">): React.ReactElement {
  return (
    <option
      className={cn("bg-background text-foreground", className)}
      {...props}
    />
  );
}

export { Select, SelectOption };
