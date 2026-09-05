import { db } from "@/lib/db";
import type { UserStats, UserStatsDay } from "@/types/api";

/** How far back the activity heatmap reaches. */
export const ACTIVITY_DAYS = 364;

const MS_PER_DAY = 86_400_000;

// Days are bucketed in UTC to maintain consistency across timezones.
async function loadDaily(
  userId: string,
  sinceMs: number,
): Promise<UserStatsDay[]> {
  const rows = await db.$queryRaw<
    { day: Date; seconds: number; entries: number }[]
  >`
    SELECT (to_timestamp("date" / 1000) AT TIME ZONE 'UTC')::date AS day,
           SUM("readingTimeSeconds")::int AS seconds,
           COUNT(*)::int AS entries
    FROM "History"
    WHERE "userId" = ${userId} AND "date" IS NOT NULL AND "date" >= ${BigInt(sinceMs)}
    GROUP BY day
    ORDER BY day
  `;
  return rows.map((r) => ({
    day: r.day.toISOString().slice(0, 10),
    seconds: r.seconds,
    entries: r.entries,
  }));
}

/** Counts back from the most recent active day, so today being empty does not zero the streak. */
function streaks(days: UserStatsDay[]): {
  current: number;
  longest: number;
} {
  const active = days.filter((d) => d.entries > 0).map((d) => d.day);
  if (active.length === 0) return { current: 0, longest: 0 };

  let longest = 1;
  let run = 1;
  for (let i = 1; i < active.length; i += 1) {
    const gap =
      (Date.parse(`${active[i]}T00:00:00Z`) -
        Date.parse(`${active[i - 1]}T00:00:00Z`)) /
      MS_PER_DAY;
    run = gap === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  // The trailing run only counts as "current" if it reaches today or yesterday.
  const today = Math.floor(Date.now() / MS_PER_DAY);
  const lastDay = Math.floor(
    Date.parse(`${active[active.length - 1]}T00:00:00Z`) / MS_PER_DAY,
  );
  const current = today - lastDay <= 1 ? run : 0;

  return { current, longest };
}

export const userStatsRepository = {
  async get(userId: string): Promise<UserStats> {
    const sinceMs =
      (Math.floor(Date.now() / MS_PER_DAY) - ACTIVITY_DAYS) * MS_PER_DAY;

    const [totals, byType, chaptersRead, bookmarks, libraryTitles, daily, top] =
      await Promise.all([
        db.history.aggregate({
          where: { userId },
          _sum: { readingTimeSeconds: true },
          _count: { _all: true },
        }),
        db.history.groupBy({
          by: ["itemType"],
          where: { userId },
          _sum: { readingTimeSeconds: true },
          _count: { _all: true },
        }),
        db.chapterState.count({ where: { userId, isRead: true } }),
        db.chapterState.count({ where: { userId, isBookmarked: true } }),
        db.manga.count({ where: { userId } }),
        loadDaily(userId, sinceMs),
        db.history.groupBy({
          by: ["mangaId"],
          where: { userId },
          _sum: { readingTimeSeconds: true },
          orderBy: { _sum: { readingTimeSeconds: "desc" } },
          take: 5,
        }),
      ]);

    const topMangas = await db.manga.findMany({
      where: { id: { in: top.map((t) => t.mangaId) } },
      include: { catalogEntry: true },
    });
    const nameById = new Map(topMangas.map((m) => [m.id, m.catalogEntry]));

    const { current, longest } = streaks(daily);

    return {
      totalSeconds: totals._sum.readingTimeSeconds ?? 0,
      totalEntries: totals._count._all,
      chaptersRead,
      bookmarks,
      libraryTitles,
      daysActive: daily.filter((d) => d.entries > 0).length,
      currentStreak: current,
      longestStreak: longest,
      byType: byType
        .map((row) => ({
          itemType: row.itemType,
          seconds: row._sum.readingTimeSeconds ?? 0,
          entries: row._count._all,
        }))
        .sort((a, b) => b.seconds - a.seconds),
      daily,
      topTitles: top.flatMap((row) => {
        const entry = nameById.get(row.mangaId);
        if (!entry) return [];
        return [
          {
            name: entry.name,
            imageUrl: entry.imageUrl,
            itemType: entry.itemType,
            seconds: row._sum.readingTimeSeconds ?? 0,
          },
        ];
      }),
    };
  },
};
