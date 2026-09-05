import type { DbClient } from "./client";
import type { EntityType, Prisma } from "@prisma/client";
import {
  type ChapterInput,
  type MangaInput,
  type CategoryInput,
  type TrackInput,
  type HistoryInput,
  type UpdateInput,
  type SyncRequest,
  toBigIntMs,
  toBigIntMsOrNull,
  toBigIntId,
  fromBigIntId,
  upsertIfNewer,
} from "./sync-shared";

// Catalog dedup (server-internal, see docs/sync_api.md)

async function resolveCatalogEntry(
  client: DbClient,
  m: MangaInput,
): Promise<bigint> {
  const link = m.link ?? null;
  const data: Prisma.CatalogEntryUncheckedCreateInput = {
    source: m.source ?? null,
    sourceId: m.sourceId ?? null,
    link,
    itemType: m.itemType,
    name: m.name ?? null,
    imageUrl: m.imageUrl ?? null,
    description: m.description ?? null,
    author: m.author ?? null,
    artist: m.artist ?? null,
    status: m.status ?? "UNKNOWN",
    genre: m.genre ?? [],
    lang: m.lang ?? null,
    lastUpdate: toBigIntMsOrNull(m.lastUpdate),
    updatedAt: toBigIntMs(m.updatedAt),
  };

  // A null link can't participate in the dedup lookup - Postgres treats every NULL as distinct in a unique index.
  if (link === null) {
    const created = await client.catalogEntry.create({
      data,
      select: { id: true },
    });
    return created.id;
  }

  const existing = await client.catalogEntry.findFirst({
    where: { source: m.source ?? null, link },
    select: { id: true, updatedAt: true },
  });
  if (!existing) {
    const created = await client.catalogEntry.create({
      data,
      select: { id: true },
    });
    return created.id;
  }
  if ((data.updatedAt as bigint) > existing.updatedAt) {
    await client.catalogEntry.update({ where: { id: existing.id }, data });
  }
  return existing.id;
}

async function resolveCatalogChapter(
  client: DbClient,
  catalogEntryId: bigint,
  c: ChapterInput,
): Promise<bigint> {
  const url = c.url ?? null;
  const data: Prisma.CatalogChapterUncheckedCreateInput = {
    catalogEntryId,
    name: c.name ?? null,
    url,
    scanlator: c.scanlator ?? null,
    dateUpload: toBigIntMsOrNull(c.dateUpload),
    isFiller: c.isFiller ?? false,
    thumbnailUrl: c.thumbnailUrl ?? null,
    description: c.description ?? null,
    downloadSize: c.downloadSize ?? null,
    duration: c.duration ?? null,
    updatedAt: toBigIntMs(c.updatedAt),
  };

  if (url === null) {
    const created = await client.catalogChapter.create({
      data,
      select: { id: true },
    });
    return created.id;
  }

  const existing = await client.catalogChapter.findUnique({
    where: { catalogEntryId_url: { catalogEntryId, url } },
    select: { id: true, updatedAt: true },
  });
  if (!existing) {
    const created = await client.catalogChapter.create({
      data,
      select: { id: true },
    });
    return created.id;
  }
  if ((data.updatedAt as bigint) > existing.updatedAt) {
    await client.catalogChapter.update({ where: { id: existing.id }, data });
  }
  return existing.id;
}

// Per-entity upserts. Each returns the clientIds it wrote (for the pull step to exclude) plus a clientId -> server id map.

export async function upsertCategories(
  client: DbClient,
  userId: string,
  rows: CategoryInput[],
): Promise<Set<number>> {
  const applied = new Set<number>();
  for (const row of rows) {
    const incomingUpdatedAt = toBigIntMs(row.updatedAt);
    const data: Prisma.CategoryUncheckedCreateInput = {
      userId,
      clientId: toBigIntId(row.clientId),
      name: row.name,
      forItemType: row.forItemType,
      pos: row.pos ?? null,
      hide: row.hide ?? false,
      shouldUpdate: row.shouldUpdate ?? true,
      updatedAt: incomingUpdatedAt,
    };
    const { applied: wasApplied } = await upsertIfNewer(
      () =>
        client.category.findUnique({
          where: {
            userId_clientId: { userId, clientId: toBigIntId(row.clientId) },
          },
        }),
      () => client.category.create({ data }),
      (existing) =>
        client.category.update({ where: { id: existing.id }, data }),
      incomingUpdatedAt,
    );
    if (wasApplied) applied.add(row.clientId);
  }
  return applied;
}

export async function upsertManga(
  client: DbClient,
  userId: string,
  rows: MangaInput[],
): Promise<{
  applied: Set<number>;
  idByClientId: Map<number, bigint>;
  // Maps this request's incoming clientId to the canonical clientId another device already established for the same catalog entry.
  remap: Map<number, number>;
}> {
  const applied = new Set<number>();
  const idByClientId = new Map<number, bigint>();
  const remap = new Map<number, number>();
  for (const row of rows) {
    const catalogEntryId = await resolveCatalogEntry(client, row);
    const incomingUpdatedAt = toBigIntMs(row.updatedAt);
    const data: Prisma.MangaUncheckedCreateInput = {
      userId,
      clientId: toBigIntId(row.clientId),
      catalogEntryId,
      favorite: row.favorite ?? false,
      dateAdded: toBigIntMsOrNull(row.dateAdded),
      lastRead: toBigIntMsOrNull(row.lastRead),
      isLocalArchive: row.isLocalArchive ?? false,
      customCoverFromTracker: row.customCoverFromTracker ?? null,
      smartUpdateDays: row.smartUpdateDays ?? null,
      updatedAt: incomingUpdatedAt,
    };
    // clientId match first (the fast path); fall back to a same-catalog-entry lookup only when this clientId is new.
    const byClientId = await client.manga.findUnique({
      where: {
        userId_clientId: { userId, clientId: toBigIntId(row.clientId) },
      },
      select: { id: true, clientId: true, updatedAt: true },
    });
    const existing =
      byClientId ??
      (await client.manga.findFirst({
        where: { userId, catalogEntryId },
        select: { id: true, clientId: true, updatedAt: true },
      }));
    const { id, applied: wasApplied } = await upsertIfNewer(
      () => Promise.resolve(existing),
      () => client.manga.create({ data }),
      // Never let the update overwrite clientId: a catalog-entry match is a different device's row with its own established clientId.
      (existing) =>
        client.manga.update({
          where: { id: existing.id },
          data: { ...data, clientId: existing.clientId },
        }),
      incomingUpdatedAt,
    );
    idByClientId.set(row.clientId, id);
    if (wasApplied) applied.add(row.clientId);
    if (existing && !byClientId) {
      const canonicalClientId = fromBigIntId(existing.clientId);
      if (canonicalClientId !== row.clientId)
        remap.set(row.clientId, canonicalClientId);
    }
  }
  return { applied, idByClientId, remap };
}

// mangaId resolution for referenced clientIds not part of this request's own manga upload (already synced earlier).
export async function resolveExistingMangaIds(
  client: DbClient,
  userId: string,
  clientIds: number[],
): Promise<Map<number, bigint>> {
  if (clientIds.length === 0) return new Map();
  const rows = await client.manga.findMany({
    where: { userId, clientId: { in: clientIds.map(toBigIntId) } },
    select: { id: true, clientId: true },
  });
  return new Map(rows.map((r) => [fromBigIntId(r.clientId), r.id]));
}

export async function upsertChapters(
  client: DbClient,
  userId: string,
  rows: ChapterInput[],
  mangaIdByClientId: Map<number, bigint>,
): Promise<{
  applied: Set<number>;
  idByClientId: Map<number, bigint>;
  // Same reasoning as upsertManga's remap, but for a chapter tracked independently on two devices before they synced.
  remap: Map<number, number>;
}> {
  const applied = new Set<number>();
  const idByClientId = new Map<number, bigint>();
  const remap = new Map<number, number>();
  for (const row of rows) {
    const mangaId = mangaIdByClientId.get(row.mangaClientId);
    if (mangaId === undefined) continue; // orphaned reference, nothing to attach to

    const manga = await client.manga.findUnique({
      where: { id: mangaId },
      select: { catalogEntryId: true },
    });
    if (!manga) continue;
    const catalogChapterId = await resolveCatalogChapter(
      client,
      manga.catalogEntryId,
      row,
    );

    const incomingUpdatedAt = toBigIntMs(row.updatedAt);
    const data: Prisma.ChapterStateUncheckedCreateInput = {
      userId,
      clientId: toBigIntId(row.clientId),
      mangaId,
      catalogChapterId,
      isRead: row.isRead ?? false,
      isBookmarked: row.isBookmarked ?? false,
      lastPageRead: row.lastPageRead ?? null,
      updatedAt: incomingUpdatedAt,
    };
    const byClientId = await client.chapterState.findUnique({
      where: {
        userId_clientId: { userId, clientId: toBigIntId(row.clientId) },
      },
      select: { id: true, clientId: true, updatedAt: true },
    });
    const existing =
      byClientId ??
      (await client.chapterState.findFirst({
        where: { userId, catalogChapterId },
        select: { id: true, clientId: true, updatedAt: true },
      }));
    const { id, applied: wasApplied } = await upsertIfNewer(
      () => Promise.resolve(existing),
      () => client.chapterState.create({ data }),
      (existing) =>
        client.chapterState.update({
          where: { id: existing.id },
          data: { ...data, clientId: existing.clientId },
        }),
      incomingUpdatedAt,
    );
    idByClientId.set(row.clientId, id);
    if (wasApplied) applied.add(row.clientId);
    if (existing && !byClientId) {
      const canonicalClientId = fromBigIntId(existing.clientId);
      if (canonicalClientId !== row.clientId)
        remap.set(row.clientId, canonicalClientId);
    }
  }
  return { applied, idByClientId, remap };
}

export async function resolveExistingChapterIds(
  client: DbClient,
  userId: string,
  clientIds: number[],
): Promise<Map<number, bigint>> {
  if (clientIds.length === 0) return new Map();
  const rows = await client.chapterState.findMany({
    where: { userId, clientId: { in: clientIds.map(toBigIntId) } },
    select: { id: true, clientId: true },
  });
  return new Map(rows.map((r) => [fromBigIntId(r.clientId), r.id]));
}

export async function upsertTracks(
  client: DbClient,
  userId: string,
  rows: TrackInput[],
  mangaIdByClientId: Map<number, bigint>,
): Promise<Set<number>> {
  const applied = new Set<number>();
  for (const row of rows) {
    const mangaId = mangaIdByClientId.get(row.mangaClientId);
    if (mangaId === undefined) continue;

    const incomingUpdatedAt = toBigIntMs(row.updatedAt);
    const data: Prisma.TrackUncheckedCreateInput = {
      userId,
      clientId: toBigIntId(row.clientId),
      mangaId,
      syncId: row.syncId ?? null,
      mediaId: row.mediaId ?? null,
      libraryId: row.libraryId ?? null,
      title: row.title ?? null,
      lastChapterRead: row.lastChapterRead ?? null,
      totalChapter: row.totalChapter ?? null,
      score: row.score ?? null,
      status: row.status ?? "READING",
      startedReadingDate: row.startedReadingDate ?? null,
      finishedReadingDate: row.finishedReadingDate ?? null,
      trackingUrl: row.trackingUrl ?? null,
      itemType: row.itemType,
      updatedAt: incomingUpdatedAt,
    };
    const { applied: wasApplied } = await upsertIfNewer(
      () =>
        client.track.findUnique({
          where: {
            userId_clientId: { userId, clientId: toBigIntId(row.clientId) },
          },
        }),
      () => client.track.create({ data }),
      (existing) => client.track.update({ where: { id: existing.id }, data }),
      incomingUpdatedAt,
    );
    if (wasApplied) applied.add(row.clientId);
  }
  return applied;
}

export async function upsertHistories(
  client: DbClient,
  userId: string,
  rows: HistoryInput[],
  mangaIdByClientId: Map<number, bigint>,
  chapterIdByClientId: Map<number, bigint>,
): Promise<Set<number>> {
  const applied = new Set<number>();
  for (const row of rows) {
    const mangaId = mangaIdByClientId.get(row.mangaClientId);
    const chapterStateId = chapterIdByClientId.get(row.chapterClientId);
    if (mangaId === undefined || chapterStateId === undefined) continue;

    const incomingUpdatedAt = toBigIntMs(row.updatedAt);
    const data: Prisma.HistoryUncheckedCreateInput = {
      userId,
      clientId: toBigIntId(row.clientId),
      mangaId,
      chapterStateId,
      itemType: row.itemType,
      date: toBigIntMsOrNull(row.date),
      readingTimeSeconds: row.readingTimeSeconds ?? 0,
      updatedAt: incomingUpdatedAt,
    };
    const { applied: wasApplied } = await upsertIfNewer(
      () =>
        client.history.findUnique({
          where: {
            userId_clientId: { userId, clientId: toBigIntId(row.clientId) },
          },
        }),
      () => client.history.create({ data }),
      (existing) => client.history.update({ where: { id: existing.id }, data }),
      incomingUpdatedAt,
    );
    if (wasApplied) applied.add(row.clientId);
  }
  return applied;
}

export async function upsertUpdates(
  client: DbClient,
  userId: string,
  rows: UpdateInput[],
  mangaIdByClientId: Map<number, bigint>,
): Promise<Set<number>> {
  const applied = new Set<number>();
  for (const row of rows) {
    const mangaId = mangaIdByClientId.get(row.mangaClientId);
    if (mangaId === undefined) continue;

    // Best-effort match by (mangaId, chapterName) against the shared catalog, same as the client does locally.
    let chapterId: bigint | null = null;
    if (row.chapterName) {
      const manga = await client.manga.findUnique({
        where: { id: mangaId },
        select: { catalogEntryId: true },
      });
      if (manga) {
        const catalogChapter = await client.catalogChapter.findFirst({
          where: {
            catalogEntryId: manga.catalogEntryId,
            name: row.chapterName,
          },
          select: { id: true },
        });
        chapterId = catalogChapter?.id ?? null;
      }
    }

    const incomingUpdatedAt = toBigIntMs(row.updatedAt);
    const data: Prisma.UpdateUncheckedCreateInput = {
      userId,
      clientId: toBigIntId(row.clientId),
      mangaId,
      chapterName: row.chapterName ?? null,
      chapterId,
      date: toBigIntMsOrNull(row.date),
      updatedAt: incomingUpdatedAt,
    };
    const { applied: wasApplied } = await upsertIfNewer(
      () =>
        client.update.findUnique({
          where: {
            userId_clientId: { userId, clientId: toBigIntId(row.clientId) },
          },
        }),
      () => client.update.create({ data }),
      (existing) => client.update.update({ where: { id: existing.id }, data }),
      incomingUpdatedAt,
    );
    if (wasApplied) applied.add(row.clientId);
  }
  return applied;
}

export async function upsertSettingsRow(
  client: DbClient,
  userId: string,
  settings: NonNullable<SyncRequest["settings"]>,
): Promise<void> {
  const incomingUpdatedAt = toBigIntMs(settings.updatedAt);
  const existing = await client.settings.findUnique({
    where: { userId },
    select: { updatedAt: true },
  });
  if (existing && incomingUpdatedAt <= existing.updatedAt) return;
  await client.settings.upsert({
    where: { userId },
    create: {
      userId,
      data: settings.data as Prisma.InputJsonValue,
      updatedAt: incomingUpdatedAt,
    },
    update: {
      data: settings.data as Prisma.InputJsonValue,
      updatedAt: incomingUpdatedAt,
    },
  });
}

// Deletions are unconditional (no per-deletion timestamp on the wire) and tombstoned so other devices learn on next pull.

const DELETION_ENTITY: Record<
  keyof NonNullable<SyncRequest["deleted"]>,
  EntityType
> = {
  categories: "CATEGORY",
  manga: "MANGA",
  chapters: "CHAPTER",
  tracks: "TRACK",
  histories: "HISTORY",
  updates: "UPDATE",
};

interface TombstoneRow {
  userId: string;
  entityType: EntityType;
  clientId: number;
  deletedAt: bigint;
}

export async function applyDeletions(
  client: DbClient,
  userId: string,
  deleted: SyncRequest["deleted"],
  now: bigint,
): Promise<void> {
  if (!deleted) return;
  const tombstones: TombstoneRow[] = [];

  // Manga deletion cascades to ChapterState/Track/History/Update - those need their own tombstones too, looked up before the delete.
  if (deleted.manga && deleted.manga.length > 0) {
    const mangaRows = await client.manga.findMany({
      where: { userId, clientId: { in: deleted.manga.map(toBigIntId) } },
      select: { id: true },
    });
    const mangaIds = mangaRows.map((m) => m.id);
    if (mangaIds.length > 0) {
      const [chapterRows, trackRows, historyRows, updateRows] =
        await Promise.all([
          client.chapterState.findMany({
            where: { userId, mangaId: { in: mangaIds } },
            select: { clientId: true },
          }),
          client.track.findMany({
            where: { userId, mangaId: { in: mangaIds } },
            select: { clientId: true },
          }),
          client.history.findMany({
            where: { userId, mangaId: { in: mangaIds } },
            select: { clientId: true },
          }),
          client.update.findMany({
            where: { userId, mangaId: { in: mangaIds } },
            select: { clientId: true },
          }),
        ]);
      tombstones.push(
        ...chapterRows.map((r) => ({
          userId,
          entityType: "CHAPTER" as const,
          clientId: fromBigIntId(r.clientId),
          deletedAt: now,
        })),
        ...trackRows.map((r) => ({
          userId,
          entityType: "TRACK" as const,
          clientId: fromBigIntId(r.clientId),
          deletedAt: now,
        })),
        ...historyRows.map((r) => ({
          userId,
          entityType: "HISTORY" as const,
          clientId: fromBigIntId(r.clientId),
          deletedAt: now,
        })),
        ...updateRows.map((r) => ({
          userId,
          entityType: "UPDATE" as const,
          clientId: fromBigIntId(r.clientId),
          deletedAt: now,
        })),
      );
    }
    await client.manga.deleteMany({
      where: { userId, clientId: { in: deleted.manga.map(toBigIntId) } },
    });
    tombstones.push(
      ...deleted.manga.map((clientId) => ({
        userId,
        entityType: "MANGA" as const,
        clientId,
        deletedAt: now,
      })),
    );
  }

  // Same reasoning for chapter (ChapterState) deletion cascading to History.
  if (deleted.chapters && deleted.chapters.length > 0) {
    const chapterRows = await client.chapterState.findMany({
      where: { userId, clientId: { in: deleted.chapters.map(toBigIntId) } },
      select: { id: true },
    });
    const chapterIds = chapterRows.map((c) => c.id);
    if (chapterIds.length > 0) {
      const historyRows = await client.history.findMany({
        where: { userId, chapterStateId: { in: chapterIds } },
        select: { clientId: true },
      });
      tombstones.push(
        ...historyRows.map((r) => ({
          userId,
          entityType: "HISTORY" as const,
          clientId: fromBigIntId(r.clientId),
          deletedAt: now,
        })),
      );
    }
    await client.chapterState.deleteMany({
      where: { userId, clientId: { in: deleted.chapters.map(toBigIntId) } },
    });
    tombstones.push(
      ...deleted.chapters.map((clientId) => ({
        userId,
        entityType: "CHAPTER" as const,
        clientId,
        deletedAt: now,
      })),
    );
  }

  // No further cascades for these, safe to delete and tombstone directly.
  const directDeleteFns: Record<
    "categories" | "tracks" | "histories" | "updates",
    (ids: number[]) => Promise<unknown>
  > = {
    categories: (ids) =>
      client.category.deleteMany({
        where: { userId, clientId: { in: ids.map(toBigIntId) } },
      }),
    tracks: (ids) =>
      client.track.deleteMany({
        where: { userId, clientId: { in: ids.map(toBigIntId) } },
      }),
    histories: (ids) =>
      client.history.deleteMany({
        where: { userId, clientId: { in: ids.map(toBigIntId) } },
      }),
    updates: (ids) =>
      client.update.deleteMany({
        where: { userId, clientId: { in: ids.map(toBigIntId) } },
      }),
  };
  for (const key of ["categories", "tracks", "histories", "updates"] as const) {
    const ids = deleted[key];
    if (!ids || ids.length === 0) continue;
    await directDeleteFns[key](ids);
    tombstones.push(
      ...ids.map((clientId) => ({
        userId,
        entityType: DELETION_ENTITY[key],
        clientId,
        deletedAt: now,
      })),
    );
  }

  if (tombstones.length > 0) {
    await client.tombstone.createMany({
      data: tombstones.map((t) => ({ ...t, clientId: toBigIntId(t.clientId) })),
    });
  }
}
