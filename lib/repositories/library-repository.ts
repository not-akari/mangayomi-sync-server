import { db } from "@/lib/db";
import type { ItemType } from "@prisma/client";
import { isLikelyNsfw } from "@/lib/moderation/nsfw-heuristic";
import { serverSettingsRepository } from "@/lib/repositories/server-settings-repository";
import type { LibraryEntry, LibraryEntryDetail } from "@/types/api";

export const libraryRepository = {
  async listPage(params: {
    userId: string;
    page: number;
    pageSize: number;
    search: string;
    itemType: ItemType | null;
  }): Promise<{ entries: LibraryEntry[]; total: number }> {
    const { userId, page, pageSize, search, itemType } = params;
    const where = {
      userId,
      favorite: true,
      ...(itemType ? { catalogEntry: { itemType } } : {}),
      ...(search
        ? {
            catalogEntry: {
              name: { contains: search, mode: "insensitive" as const },
            },
          }
        : {}),
    };
    const [rows, total, settings] = await Promise.all([
      db.manga.findMany({
        where,
        include: { catalogEntry: true },
        orderBy: { dateAdded: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.manga.count({ where }),
      serverSettingsRepository.get(),
    ]);
    return {
      entries: rows.map((r) => ({
        clientId: Number(r.clientId),
        name: r.catalogEntry.name,
        imageUrl: r.catalogEntry.imageUrl,
        itemType: r.catalogEntry.itemType,
        status: r.catalogEntry.status,
        favorite: r.favorite,
        lastRead: r.lastRead === null ? null : Number(r.lastRead),
        dateAdded: r.dateAdded === null ? null : Number(r.dateAdded),
        isLikelyNsfw: isLikelyNsfw(
          {
            name: r.catalogEntry.name,
            genre: r.catalogEntry.genre,
            source: r.catalogEntry.source,
            description: r.catalogEntry.description,
          },
          settings,
        ),
      })),
      total,
    };
  },

  // Fetched on demand when a card is clicked, not part of the paginated list query above.
  async getDetail(
    userId: string,
    clientId: number,
  ): Promise<LibraryEntryDetail | null> {
    const [manga, settings] = await Promise.all([
      db.manga.findUnique({
        where: { userId_clientId: { userId, clientId: BigInt(clientId) } },
        include: {
          catalogEntry: {
            include: { _count: { select: { chapters: true } } },
          },
          _count: { select: { chapterStates: true } },
        },
      }),
      serverSettingsRepository.get(),
    ]);
    if (!manga) return null;
    const readChapters = await db.chapterState.count({
      where: { userId, mangaId: manga.id, isRead: true },
    });
    return {
      clientId: Number(manga.clientId),
      name: manga.catalogEntry.name,
      imageUrl: manga.catalogEntry.imageUrl,
      itemType: manga.catalogEntry.itemType,
      status: manga.catalogEntry.status,
      favorite: manga.favorite,
      isLikelyNsfw: isLikelyNsfw(
        {
          name: manga.catalogEntry.name,
          genre: manga.catalogEntry.genre,
          source: manga.catalogEntry.source,
          description: manga.catalogEntry.description,
        },
        settings,
      ),
      description: manga.catalogEntry.description,
      author: manga.catalogEntry.author,
      artist: manga.catalogEntry.artist,
      genre: manga.catalogEntry.genre,
      source: manga.catalogEntry.source,
      link: manga.catalogEntry.link,
      lang: manga.catalogEntry.lang,
      dateAdded: manga.dateAdded === null ? null : Number(manga.dateAdded),
      lastRead: manga.lastRead === null ? null : Number(manga.lastRead),
      totalChapters: manga.catalogEntry._count.chapters,
      readChapters,
    };
  },
};
