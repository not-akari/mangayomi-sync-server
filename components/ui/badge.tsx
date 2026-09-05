import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      tone: {
        muted: "bg-foreground/10 text-muted-foreground",
        primary: "bg-primary/10 text-primary",
        destructive: "bg-destructive/10 text-destructive",
        warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        info: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
        success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
      },
    },
    defaultVariants: { tone: "muted" },
  },
);

function Badge({
  className,
  tone,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ tone }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
