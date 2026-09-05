import { Card, CardContent } from "@/components/ui/card";

export function StatCard({
  value,
  label,
}: {
  value: string | number;
  label: string;
}): React.ReactElement {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1">
        <span className="text-2xl font-bold">{value}</span>
        <span className="text-sm text-muted-foreground">{label}</span>
      </CardContent>
    </Card>
  );
}

// Keeps a type's count and its implied count (e.g. chapters) in one card instead of a same-looking, disconnected card.
export function NestedStatCard({
  value,
  label,
  subValue,
  subLabel,
}: {
  value: string | number;
  label: string;
  subValue: string | number;
  subLabel: string;
}): React.ReactElement {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-2xl font-bold">{value}</span>
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
        <div className="flex items-baseline gap-1.5 border-t pt-2">
          <span className="text-sm font-medium">{subValue}</span>
          <span className="text-xs text-muted-foreground">{subLabel}</span>
        </div>
      </CardContent>
    </Card>
  );
}
