import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/formatters/format-duration";
import type { UserStatsDay } from "@/types/api";

const MS_PER_DAY = 86_400_000;
const DAYS_IN_WEEK = 7;

// Four steps plus empty using brand colors for activity intensity.
const LEVELS = [
  "bg-muted",
  "bg-brand/30",
  "bg-brand/55",
  "bg-brand/80",
  "bg-brand",
];

function level(seconds: number, max: number): number {
  if (seconds <= 0 || max <= 0) return 0;
  return Math.min(4, Math.ceil((seconds / max) * 4));
}

function isoDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

// Renders whole weeks ending on the specified date to keep server and client renders pure.
export function ActivityHeatmap({
  days,
  today,
  spanDays,
  legendLess,
  legendMore,
}: {
  days: UserStatsDay[];
  /** The last day to draw, as YYYY-MM-DD. */
  today: string;
  spanDays: number;
  legendLess: string;
  legendMore: string;
}): React.ReactElement {
  const byDay = new Map(days.map((d) => [d.day, d]));
  const max = days.reduce((best, d) => Math.max(best, d.seconds), 0);

  const todayMs = Date.parse(`${today}T00:00:00Z`);
  // Back up to the Sunday on or before the first day we want to show.
  const firstMs =
    todayMs -
    spanDays * MS_PER_DAY -
    new Date(todayMs - spanDays * MS_PER_DAY).getUTCDay() * MS_PER_DAY;

  const weeks: { key: string; days: UserStatsDay[] }[] = [];
  for (let ms = firstMs; ms <= todayMs; ms += DAYS_IN_WEEK * MS_PER_DAY) {
    const week: UserStatsDay[] = [];
    for (let i = 0; i < DAYS_IN_WEEK; i += 1) {
      const dayMs = ms + i * MS_PER_DAY;
      if (dayMs > todayMs) break;
      const key = isoDay(dayMs);
      week.push(byDay.get(key) ?? { day: key, seconds: 0, entries: 0 });
    }
    if (week.length > 0) weeks.push({ key: isoDay(ms), days: week });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="thin-scrollbar overflow-x-auto pb-1">
        <div className="flex gap-[3px]">
          {weeks.map((week) => (
            <div key={week.key} className="flex flex-col gap-[3px]">
              {week.days.map((day) => (
                <div
                  key={day.day}
                  title={`${day.day}: ${formatDuration(day.seconds)}`}
                  className={cn(
                    "size-[11px] rounded-[2px]",
                    LEVELS[level(day.seconds, max)],
                  )}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>{legendLess}</span>
        {LEVELS.map((className) => (
          <span
            key={className}
            className={cn("size-[11px] rounded-[2px]", className)}
          />
        ))}
        <span>{legendMore}</span>
      </div>
    </div>
  );
}
