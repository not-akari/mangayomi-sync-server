import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const VARIANT_STYLES = {
  icon: {
    container: "flex items-center justify-center gap-3 pt-2",
    button: "outline" as const,
    buttonClassName: undefined,
    buttonSize: "icon" as const,
    label: "text-sm text-muted-foreground",
  },
  ghost: {
    container: "flex items-center justify-between gap-2",
    button: "ghost" as const,
    buttonClassName: "h-8 px-2",
    buttonSize: "default" as const,
    label: "text-sm text-muted-foreground",
  },
  "ghost-compact": {
    container: "flex items-center justify-between gap-2 pt-1",
    button: "ghost" as const,
    buttonClassName: "h-7 px-2",
    buttonSize: "default" as const,
    label: "text-xs text-muted-foreground",
  },
};

// Shared "‹ page X of Y ›" footer - three variants matching the shapes this pattern grew across the app.
export function PaginationFooter({
  page,
  totalPages,
  onPrev,
  onNext,
  label,
  variant = "icon",
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  label: string;
  variant?: keyof typeof VARIANT_STYLES;
}): React.ReactElement | null {
  if (totalPages <= 1) return null;
  const styles = VARIANT_STYLES[variant];
  return (
    <div className={styles.container}>
      <Button
        variant={styles.button}
        size={styles.buttonSize}
        className={styles.buttonClassName}
        disabled={page <= 1}
        onClick={onPrev}
      >
        <ChevronLeft className="size-4" />
      </Button>
      <span className={styles.label}>{label}</span>
      <Button
        variant={styles.button}
        size={styles.buttonSize}
        className={styles.buttonClassName}
        disabled={page >= totalPages}
        onClick={onNext}
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
