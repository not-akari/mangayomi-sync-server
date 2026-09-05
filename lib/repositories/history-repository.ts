import { db } from "@/lib/db";
import { catalogNameSearchWhere } from "@/lib/repositories/catalog-search";
import type { HistoryEntry } from "@/types/api";

export const historyPageRepository = {
  async listPage(params: {
    userId: string;
    page: number;
    pageSize: number;
    search: string;
  }): Promise<{ entries: HistoryEntry[]; total: number }> {
    const { userId, page, pageSize, search } = params;
    const where = { userId, ...catalogNameSearchWhere(search) };
    const [rows, total] = await Promise.all([
      db.history.findMany({
        where,
        include: {
          manga: { include: { catalogEntry: true } },
          chapterState: { include: { catalogChapter: true } },
        },
        orderBy: { date: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.history.count({ where }),
    ]);
    return {
      entries: rows.map((r) => ({
        clientId: Number(r.clientId),
        mangaName: r.manga.catalogEntry.name,
        imageUrl: r.manga.catalogEntry.imageUrl,
        chapterName: r.chapterState.catalogChapter.name,
        date: r.date === null ? null : Number(r.date),
        readingTimeSeconds: r.readingTimeSeconds,
      })),
      total,
    };
  },
};
