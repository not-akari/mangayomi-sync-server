import { db } from "@/lib/db";
import { catalogNameSearchWhere } from "@/lib/repositories/catalog-search";
import type { TrackingEntry } from "@/types/api";

export const trackingPageRepository = {
  async listPage(params: {
    userId: string;
    page: number;
    pageSize: number;
    search: string;
  }): Promise<{ entries: TrackingEntry[]; total: number }> {
    const { userId, page, pageSize, search } = params;
    const where = { userId, ...catalogNameSearchWhere(search) };
    const [rows, total] = await Promise.all([
      db.track.findMany({
        where,
        include: { manga: { include: { catalogEntry: true } } },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.track.count({ where }),
    ]);
    return {
      entries: rows.map((r) => ({
        clientId: Number(r.clientId),
        mangaName: r.manga.catalogEntry.name,
        imageUrl: r.manga.catalogEntry.imageUrl,
        title: r.title,
        status: r.status,
        lastChapterRead: r.lastChapterRead,
        totalChapter: r.totalChapter,
        score: r.score,
        trackingUrl: r.trackingUrl,
      })),
      total,
    };
  },
};
