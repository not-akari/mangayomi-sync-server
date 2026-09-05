import { db } from "@/lib/db";
import { catalogNameSearchWhere } from "@/lib/repositories/catalog-search";
import type { UpdateEntry } from "@/types/api";

export const updatesPageRepository = {
  async listPage(params: {
    userId: string;
    page: number;
    pageSize: number;
    search: string;
  }): Promise<{ entries: UpdateEntry[]; total: number }> {
    const { userId, page, pageSize, search } = params;
    const where = { userId, ...catalogNameSearchWhere(search) };
    const [rows, total] = await Promise.all([
      db.update.findMany({
        where,
        include: { manga: { include: { catalogEntry: true } } },
        orderBy: { date: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.update.count({ where }),
    ]);
    return {
      entries: rows.map((r) => ({
        clientId: Number(r.clientId),
        mangaName: r.manga.catalogEntry.name,
        imageUrl: r.manga.catalogEntry.imageUrl,
        chapterName: r.chapterName,
        date: r.date === null ? null : Number(r.date),
      })),
      total,
    };
  },
};
