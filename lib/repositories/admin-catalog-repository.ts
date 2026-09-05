import { db } from "@/lib/db";
import { Prisma, type ItemType } from "@prisma/client";
import { isLikelyNsfw } from "@/lib/moderation/nsfw-heuristic";
import { serverSettingsRepository } from "@/lib/repositories/server-settings-repository";
import type { AdminCatalogEntry } from "@/types/api";

export const adminCatalogRepository = {
  async listPage(params: {
    page: number;
    pageSize: number;
    search: string;
    itemType: ItemType | null;
    overriddenOnly: boolean;
  }): Promise<{ entries: AdminCatalogEntry[]; total: number }> {
    const { page, pageSize, search, itemType, overriddenOnly } = params;

    let matchingIds: bigint[] | null = null;
    if (search) {
      const rows = await db.$queryRaw<{ id: bigint }[]>`
        SELECT id FROM "CatalogEntry"
        WHERE name ILIKE ${"%" + search + "%"}
           OR EXISTS (SELECT 1 FROM unnest(genre) g WHERE g ILIKE ${"%" + search + "%"})
      `;
      matchingIds = rows.map((r) => r.id);
    }

    const where: Prisma.CatalogEntryWhereInput = {
      ...(itemType ? { itemType } : {}),
      ...(matchingIds ? { id: { in: matchingIds } } : {}),
      ...(overriddenOnly ? { nsfwOverride: { not: null } } : {}),
    };

    const [rows, total, settings] = await Promise.all([
      db.catalogEntry.findMany({
        where,
        orderBy: { id: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.catalogEntry.count({ where }),
      serverSettingsRepository.get(),
    ]);

    const entries = rows.map((r) => {
      const heuristicNsfw = isLikelyNsfw(
        {
          name: r.name,
          genre: r.genre,
          source: r.source,
          description: r.description,
        },
        settings,
      );
      return {
        id: Number(r.id),
        name: r.name,
        imageUrl: r.imageUrl,
        itemType: r.itemType,
        source: r.source,
        genre: r.genre,
        heuristicNsfw,
        nsfwOverride: r.nsfwOverride,
        isNsfw: r.nsfwOverride ?? heuristicNsfw,
      };
    });

    return { entries, total };
  },

  setOverride(id: number, override: boolean | null) {
    return db.catalogEntry.update({
      where: { id: BigInt(id) },
      data: { nsfwOverride: override },
    });
  },

  setOverrideMany(ids: number[], override: boolean | null) {
    return db.catalogEntry.updateMany({
      where: { id: { in: ids.map((id) => BigInt(id)) } },
      data: { nsfwOverride: override },
    });
  },
};
