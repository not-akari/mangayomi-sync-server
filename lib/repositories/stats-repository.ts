import { db } from "@/lib/db";
import type { ItemType } from "@prisma/client";
import { isLikelyNsfw } from "@/lib/moderation/nsfw-heuristic";
import { serverSettingsRepository } from "@/lib/repositories/server-settings-repository";
import type { UserStatsDay } from "@/types/api";

// Server activity heatmap span.
export const SERVER_ACTIVITY_DAYS = 365;
const MS_PER_DAY = 86_400_000;

function emptyItemTypeCounts(): Record<ItemType, number> {
  return { MANGA: 0, ANIME: 0, NOVEL: 0 };
}

export const statsRepository = {
  async distinctGenreTags(): Promise<string[]> {
    const rows = await db.$queryRaw<{ tag: string }[]>`
      SELECT DISTINCT unnest(genre) AS tag FROM "CatalogEntry" ORDER BY tag
    `;
    return rows.map((r) => r.tag);
  },

  async countMangaByItemType(): Promise<Record<ItemType, number>> {
    const rows = await db.catalogEntry.groupBy({
      by: ["itemType"],
      _count: { _all: true },
    });
    const result = emptyItemTypeCounts();
    for (const row of rows) result[row.itemType] = row._count._all;
    return result;
  },

  async countChaptersByItemType(): Promise<Record<ItemType, number>> {
    const rows = await db.$queryRaw<{ itemType: ItemType; count: number }[]>`
      SELECT c."itemType", COUNT(ch.id)::int AS count
      FROM "CatalogChapter" ch
      JOIN "CatalogEntry" c ON c.id = ch."catalogEntryId"
      GROUP BY c."itemType"
    `;
    const result = emptyItemTypeCounts();
    for (const row of rows) result[row.itemType] = row.count;
    return result;
  },

  async databaseSizeBytes(): Promise<number> {
    const rows = await db.$queryRaw<{ size: bigint }[]>`
      SELECT pg_database_size(current_database()) AS size
    `;
    return Number(rows[0]?.size ?? 0);
  },

  async userDataSizeBytes(userId: string): Promise<number> {
    const rows = await db.$queryRaw<{ size: bigint }[]>`
      SELECT
        COALESCE((SELECT SUM(pg_column_size(t)) FROM "Manga" t WHERE t."userId" = ${userId}), 0) +
        COALESCE((SELECT SUM(pg_column_size(t)) FROM "ChapterState" t WHERE t."userId" = ${userId}), 0) +
        COALESCE((SELECT SUM(pg_column_size(t)) FROM "Category" t WHERE t."userId" = ${userId}), 0) +
        COALESCE((SELECT SUM(pg_column_size(t)) FROM "MangaCategory" t JOIN "Manga" m ON m.id = t."mangaId" WHERE m."userId" = ${userId}), 0) +
        COALESCE((SELECT SUM(pg_column_size(t)) FROM "Track" t WHERE t."userId" = ${userId}), 0) +
        COALESCE((SELECT SUM(pg_column_size(t)) FROM "History" t WHERE t."userId" = ${userId}), 0) +
        COALESCE((SELECT SUM(pg_column_size(t)) FROM "Update" t WHERE t."userId" = ${userId}), 0) +
        COALESCE((SELECT SUM(pg_column_size(t)) FROM "Settings" t WHERE t."userId" = ${userId}), 0)
        AS size
    `;
    return Number(rows[0]?.size ?? 0);
  },

  async dailyServerActivity(days: number): Promise<UserStatsDay[]> {
    const sinceMs =
      (Math.floor(Date.now() / MS_PER_DAY) - days) * MS_PER_DAY;
    const rows = await db.$queryRaw<
      { day: Date; seconds: number; entries: number }[]
    >`
      SELECT (to_timestamp("date" / 1000) AT TIME ZONE 'UTC')::date AS day,
             SUM("readingTimeSeconds")::int AS seconds,
             COUNT(*)::int AS entries
      FROM "History"
      WHERE "date" IS NOT NULL AND "date" >= ${BigInt(sinceMs)}
      GROUP BY day
      ORDER BY day
    `;
    return rows.map((r) => ({
      day: r.day.toISOString().slice(0, 10),
      seconds: r.seconds,
      entries: r.entries,
    }));
  },

  async syncVolume(sinceDays: number): Promise<number> {
    const sinceMs = BigInt(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
    const [historyCount, updateCount] = await Promise.all([
      db.history.count({ where: { updatedAt: { gte: sinceMs } } }),
      db.update.count({ where: { updatedAt: { gte: sinceMs } } }),
    ]);
    return historyCount + updateCount;
  },

  async nsfwStats(): Promise<{
    total: number;
    manualNsfw: number;
    manualSafe: number;
    autoFlagged: number;
  }> {
    const [total, manualNsfw, manualSafe, unreviewed, settings] =
      await Promise.all([
        db.catalogEntry.count(),
        db.catalogEntry.count({ where: { nsfwOverride: true } }),
        db.catalogEntry.count({ where: { nsfwOverride: false } }),
        db.catalogEntry.findMany({
          where: { nsfwOverride: null },
          select: { name: true, genre: true, source: true, description: true },
        }),
        serverSettingsRepository.get(),
      ]);
    const autoFlagged = unreviewed.filter((entry) =>
      isLikelyNsfw(entry, settings),
    ).length;
    return { total, manualNsfw, manualSafe, autoFlagged };
  },

  async userLibraryStats(userId: string): Promise<{
    libraryByType: Record<ItemType, number>;
    totalLibrary: number;
    favorites: number;
    chaptersByType: Record<ItemType, number>;
    chaptersTotal: number;
    chaptersRead: number;
    chaptersReadByType: Record<ItemType, number>;
  }> {
    const [mangaRows, chapterRows] = await Promise.all([
      db.$queryRaw<{ itemType: ItemType; total: number; favorites: number }[]>`
        SELECT
          c."itemType",
          COUNT(m.id)::int AS "total",
          COUNT(CASE WHEN m.favorite THEN 1 END)::int AS "favorites"
        FROM "Manga" m
        JOIN "CatalogEntry" c ON c.id = m."catalogEntryId"
        WHERE m."userId" = ${userId}
        GROUP BY c."itemType"
      `,
      db.$queryRaw<{ itemType: ItemType; total: number; read: number }[]>`
        SELECT
          c."itemType",
          COUNT(cs.id)::int AS "total",
          COUNT(CASE WHEN cs."isRead" THEN 1 END)::int AS "read"
        FROM "ChapterState" cs
        JOIN "Manga" m ON m.id = cs."mangaId"
        JOIN "CatalogEntry" c ON c.id = m."catalogEntryId"
        WHERE cs."userId" = ${userId}
        GROUP BY c."itemType"
      `,
    ]);

    const libraryByType = emptyItemTypeCounts();
    let totalLibrary = 0;
    let favorites = 0;
    for (const row of mangaRows) {
      libraryByType[row.itemType] = row.total;
      totalLibrary += row.total;
      favorites += row.favorites;
    }

    const chaptersByType = emptyItemTypeCounts();
    const chaptersReadByType = emptyItemTypeCounts();
    let chaptersTotal = 0;
    let chaptersRead = 0;
    for (const row of chapterRows) {
      chaptersByType[row.itemType] = row.total;
      chaptersReadByType[row.itemType] = row.read;
      chaptersTotal += row.total;
      chaptersRead += row.read;
    }

    return {
      libraryByType,
      totalLibrary,
      favorites,
      chaptersReadByType,
      chaptersByType,
      chaptersTotal,
      chaptersRead,
    };
  },
};
