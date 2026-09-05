"use client";

import { useSeasonalBackgroundToggle } from "@/components/layout/seasonal-background-provider";

// Doubles as the seasonal-background easter egg trigger - looks and behaves like the plain static badge it always was.
export function SelfHostedBadge({
  label,
}: {
  label: string;
}): React.ReactElement {
  const toggle = useSeasonalBackgroundToggle();

  return (
    <button
      type="button"
      onClick={toggle}
      className="cursor-default rounded-full border px-3 py-1 text-xs text-muted-foreground"
    >
      {label}
    </button>
  );
}
