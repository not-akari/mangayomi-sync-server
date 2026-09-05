import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MetricTile({
  value,
  label,
  href,
  className,
}: {
  value: string | number;
  label: string;
  href?: string;
  className?: string;
}): React.ReactElement {
  const content = (
    <CardContent className="flex flex-col gap-0.5 py-3">
      <span className="text-xl font-bold tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </CardContent>
  );

  if (href) {
    return (
      <Link href={href} className={cn("block", className)}>
        <Card className="transition-colors hover:bg-muted/30">{content}</Card>
      </Link>
    );
  }

  return <Card className={className}>{content}</Card>;
}
