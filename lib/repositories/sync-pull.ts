import type { DbClient } from "./client";
import type { EntityType } from "@prisma/client";
import { SYNC } from "@/lib/config";
import {
  type WireCategory,
  type WireManga,
  type WireChapter,
  type WireTrack,
  type WireHistory,
  type WireUpdate,
  type WireSettings,
  type WireTombstones,
  fromBigIntMs,
  fromBigIntMsOrNull,
  fromBigIntId,
  toBigIntId,
} from "./sync-shared";

// Pull side: everything changed since `since` minus this request's own upload, paginated via hasMore + cursor.
const PULL_PAGE_SIZE = SYNC.pullPageSize;

export interface Cursor {
  updatedAt: bigint;
  id: bigint;
}

export interface PagedResult<T> {
  rows: T[];
  hasMore: boolean;
  nextCursor: string | null;
  // Only computed on the first page (cursor === null), so resumed pages skip the count query; lets a client show real progress.
  totalCount?: number;
}

export function decodeCursor(raw: string | null | undefined): Cursor | null {
  if (!raw) return null;
  const [updatedAtRaw, idRaw] = raw.split("_");
  if (!updatedAtRaw || !idRaw) return null;
  try {
    return { updatedAt: BigInt(updatedAtRaw), id: BigInt(idRaw) };
  } catch {
    return null;
  }
}

function encodeCursor(updatedAt: bigint, id: bigint): string {
  return `${updatedAt}_${id}`;
}

interface PaginationWhere {
  updatedAt?: { gte: bigint };
  OR?: [
    { updatedAt: { gt: bigint } },
    { updatedAt: bigint; id: { gt: bigint } },
  ];
}

// `since` bounds the pull, `cursor` resumes partway through it; `gte` (not `gt`) at the boundary so rows with the default updatedAt=0 stay visible on a since=0 first pull.
function paginationWhere(
  since: bigint,
  cursor: Cursor | null,
): PaginationWhere {
  if (!cursor) return { updatedAt: { gte: since } };
  return {
    OR: [
      { updatedAt: { gt: cursor.updatedAt } },
      { updatedAt: cursor.updatedAt, id: { gt: cursor.id } },
    ],
  };
}

function paginateRows<Row extends { id: bigint; updatedAt: bigint }>(
  rows: Row[],
): PagedResult<Row> {
  const hasMore = rows.length > PULL_PAGE_SIZE;
  const page = hasMore ? rows.slice(0, PULL_PAGE_SIZE) : rows;
  const last = page[page.length - 1];
  return {
    rows: page,
    hasMore,
    nextCursor: hasMore && last ? encodeCursor(last.updatedAt, last.id) : null,
  };
}

export async function pullCategories(
  client: DbClient,
  userId: string,
  since: bigint,
  cursor: Cursor | null,
  excludeClientIds: Set<number>,
): Promise<PagedResult<WireCategory>> {
  const where = {
    userId,
    ...paginationWhere(since, cursor),
    ...(excludeClientIds.size > 0
      ? { clientId: { notIn: [...excludeClientIds].map(toBigIntId) } }
      : {}),
  };
  const [rows, totalCount] = await Promise.all([
    client.category.findMany({
      where,
      orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
      take: PULL_PAGE_SIZE + 1,
    }),
    cursor === null
      ? client.category.count({ where: { userId, updatedAt: { gte: since } } })
      : undefined,
  ]);
  const { rows: page, hasMore, nextCursor } = paginateRows(rows);
  return {
    rows: page.map((r) => ({
      clientId: fromBigIntId(r.clientId),
      name: r.name,
      forItemType: r.forItemType,
      pos: r.pos,
      hide: r.hide,
      shouldUpdate: r.shouldUpdate,
      updatedAt: fromBigIntMs(r.updatedAt),
    })),
    hasMore,
    nextCursor,
    totalCount,
  };
}

export async function pullManga(
  client: DbClient,
  userId: string,
  since: bigint,
  cursor: Cursor | null,
  excludeClientIds: Set<number>,
): Promise<PagedResult<WireManga>> {
  const where = {
    userId,
    ...paginationWhere(since, cursor),
    ...(excludeClientIds.size > 0
      ? { clientId: { notIn: [...excludeClientIds].map(toBigIntId) } }
      : {}),
  };
  const [rows, totalCount] = await Promise.all([
    client.manga.findMany({
      where,
      orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
      take: PULL_PAGE_SIZE + 1,
      include: { catalogEntry: true },
    }),
    cursor === null
      ? client.manga.count({ where: { userId, updatedAt: { gte: since } } })
      : undefined,
  ]);
  const { rows: page, hasMore, nextCursor } = paginateRows(rows);
  return {
    rows: page.map((r) => ({
      clientId: fromBigIntId(r.clientId),
      source: r.catalogEntry.source,
      sourceId: r.catalogEntry.sourceId,
      link: r.catalogEntry.link,
      itemType: r.catalogEntry.itemType,
      name: r.catalogEntry.name,
      imageUrl: r.catalogEntry.imageUrl,
      description: r.catalogEntry.description,
      author: r.catalogEntry.author,
      artist: r.catalogEntry.artist,
      status: r.catalogEntry.status,
      genre: r.catalogEntry.genre,
      lang: r.catalogEntry.lang,
      lastUpdate: fromBigIntMsOrNull(r.catalogEntry.lastUpdate),
      favorite: r.favorite,
      dateAdded: fromBigIntMsOrNull(r.dateAdded),
      lastRead: fromBigIntMsOrNull(r.lastRead),
      isLocalArchive: r.isLocalArchive,
      customCoverFromTracker: r.customCoverFromTracker,
      smartUpdateDays: r.smartUpdateDays,
      updatedAt: fromBigIntMs(r.updatedAt),
    })),
    hasMore,
    nextCursor,
    totalCount,
  };
}

export async function pullChapters(
  client: DbClient,
  userId: string,
  since: bigint,
  cursor: Cursor | null,
  excludeClientIds: Set<number>,
): Promise<PagedResult<WireChapter>> {
  const where = {
    userId,
    ...paginationWhere(since, cursor),
    ...(excludeClientIds.size > 0
      ? { clientId: { notIn: [...excludeClientIds].map(toBigIntId) } }
      : {}),
  };
  const [rows, totalCount] = await Promise.all([
    client.chapterState.findMany({
      where,
      orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
      take: PULL_PAGE_SIZE + 1,
      include: { catalogChapter: true, manga: { select: { clientId: true } } },
    }),
    cursor === null
      ? client.chapterState.count({
          where: { userId, updatedAt: { gte: since } },
        })
      : undefined,
  ]);
  const { rows: page, hasMore, nextCursor } = paginateRows(rows);
  return {
    rows: page.map((r) => ({
      clientId: fromBigIntId(r.clientId),
      mangaClientId: fromBigIntId(r.manga.clientId),
      name: r.catalogChapter.name,
      url: r.catalogChapter.url,
      scanlator: r.catalogChapter.scanlator,
      dateUpload: fromBigIntMsOrNull(r.catalogChapter.dateUpload),
      isFiller: r.catalogChapter.isFiller,
      thumbnailUrl: r.catalogChapter.thumbnailUrl,
      description: r.catalogChapter.description,
      downloadSize: r.catalogChapter.downloadSize,
      duration: r.catalogChapter.duration,
      isRead: r.isRead,
      isBookmarked: r.isBookmarked,
      lastPageRead: r.lastPageRead,
      updatedAt: fromBigIntMs(r.updatedAt),
    })),
    hasMore,
    nextCursor,
    totalCount,
  };
}

export async function pullTracks(
  client: DbClient,
  userId: string,
  since: bigint,
  cursor: Cursor | null,
  excludeClientIds: Set<number>,
): Promise<PagedResult<WireTrack>> {
  const where = {
    userId,
    ...paginationWhere(since, cursor),
    ...(excludeClientIds.size > 0
      ? { clientId: { notIn: [...excludeClientIds].map(toBigIntId) } }
      : {}),
  };
  const [rows, totalCount] = await Promise.all([
    client.track.findMany({
      where,
      orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
      take: PULL_PAGE_SIZE + 1,
      include: { manga: { select: { clientId: true } } },
    }),
    cursor === null
      ? client.track.count({ where: { userId, updatedAt: { gte: since } } })
      : undefined,
  ]);
  const { rows: page, hasMore, nextCursor } = paginateRows(rows);
  return {
    rows: page.map((r) => ({
      clientId: fromBigIntId(r.clientId),
      mangaClientId: fromBigIntId(r.manga.clientId),
      syncId: r.syncId,
      mediaId: r.mediaId,
      libraryId: r.libraryId,
      title: r.title,
      lastChapterRead: r.lastChapterRead,
      totalChapter: r.totalChapter,
      score: r.score,
      status: r.status,
      startedReadingDate: r.startedReadingDate,
      finishedReadingDate: r.finishedReadingDate,
      trackingUrl: r.trackingUrl,
      itemType: r.itemType,
      updatedAt: fromBigIntMs(r.updatedAt),
    })),
    hasMore,
    nextCursor,
    totalCount,
  };
}

export async function pullHistories(
  client: DbClient,
  userId: string,
  since: bigint,
  cursor: Cursor | null,
  excludeClientIds: Set<number>,
): Promise<PagedResult<WireHistory>> {
  const where = {
    userId,
    ...paginationWhere(since, cursor),
    ...(excludeClientIds.size > 0
      ? { clientId: { notIn: [...excludeClientIds].map(toBigIntId) } }
      : {}),
  };
  const [rows, totalCount] = await Promise.all([
    client.history.findMany({
      where,
      orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
      take: PULL_PAGE_SIZE + 1,
      include: {
        manga: { select: { clientId: true } },
        chapterState: { select: { clientId: true } },
      },
    }),
    cursor === null
      ? client.history.count({ where: { userId, updatedAt: { gte: since } } })
      : undefined,
  ]);
  const { rows: page, hasMore, nextCursor } = paginateRows(rows);
  return {
    rows: page.map((r) => ({
      clientId: fromBigIntId(r.clientId),
      mangaClientId: fromBigIntId(r.manga.clientId),
      chapterClientId: fromBigIntId(r.chapterState.clientId),
      itemType: r.itemType,
      date: fromBigIntMsOrNull(r.date),
      readingTimeSeconds: r.readingTimeSeconds,
      updatedAt: fromBigIntMs(r.updatedAt),
    })),
    hasMore,
    nextCursor,
    totalCount,
  };
}

export async function pullUpdates(
  client: DbClient,
  userId: string,
  since: bigint,
  cursor: Cursor | null,
  excludeClientIds: Set<number>,
): Promise<PagedResult<WireUpdate>> {
  const where = {
    userId,
    ...paginationWhere(since, cursor),
    ...(excludeClientIds.size > 0
      ? { clientId: { notIn: [...excludeClientIds].map(toBigIntId) } }
      : {}),
  };
  const [rows, totalCount] = await Promise.all([
    client.update.findMany({
      where,
      orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
      take: PULL_PAGE_SIZE + 1,
      include: { manga: { select: { clientId: true } } },
    }),
    cursor === null
      ? client.update.count({ where: { userId, updatedAt: { gte: since } } })
      : undefined,
  ]);
  const { rows: page, hasMore, nextCursor } = paginateRows(rows);
  return {
    rows: page.map((r) => ({
      clientId: fromBigIntId(r.clientId),
      mangaClientId: fromBigIntId(r.manga.clientId),
      chapterName: r.chapterName,
      date: fromBigIntMsOrNull(r.date),
      updatedAt: fromBigIntMs(r.updatedAt),
    })),
    hasMore,
    nextCursor,
    totalCount,
  };
}

export async function pullSettings(
  client: DbClient,
  userId: string,
  since: bigint,
): Promise<WireSettings | null> {
  const row = await client.settings.findUnique({ where: { userId } });
  if (!row || row.updatedAt < since) return null;
  return { data: row.data, updatedAt: fromBigIntMs(row.updatedAt) };
}

export interface TombstonesPage {
  entities: WireTombstones;
  hasMore: boolean;
  nextCursor: string | null;
  totalCount?: number;
}

export async function pullTombstones(
  client: DbClient,
  userId: string,
  since: bigint,
  cursor: Cursor | null,
): Promise<TombstonesPage> {
  const [rows, totalCount] = await Promise.all([
    client.tombstone.findMany({
      where: {
        userId,
        ...(cursor
          ? {
              OR: [
                { deletedAt: { gt: cursor.updatedAt } },
                { deletedAt: cursor.updatedAt, id: { gt: cursor.id } },
              ],
            }
          : { deletedAt: { gt: since } }),
      },
      orderBy: [{ deletedAt: "asc" }, { id: "asc" }],
      take: PULL_PAGE_SIZE + 1,
      select: { id: true, entityType: true, clientId: true, deletedAt: true },
    }),
    cursor === null
      ? client.tombstone.count({ where: { userId, deletedAt: { gt: since } } })
      : undefined,
  ]);
  const hasMore = rows.length > PULL_PAGE_SIZE;
  const page = hasMore ? rows.slice(0, PULL_PAGE_SIZE) : rows;
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last ? encodeCursor(last.deletedAt, last.id) : null;

  const entities: WireTombstones = {
    categories: [],
    manga: [],
    chapters: [],
    tracks: [],
    histories: [],
    updates: [],
  };
  const keyByEntity: Record<EntityType, keyof typeof entities> = {
    CATEGORY: "categories",
    MANGA: "manga",
    CHAPTER: "chapters",
    TRACK: "tracks",
    HISTORY: "histories",
    UPDATE: "updates",
  };
  for (const row of page) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- keyByEntity covers every EntityType, entities is pre-seeded for every key
    entities[keyByEntity[row.entityType]]!.push(fromBigIntId(row.clientId));
  }
  return { entities, hasMore, nextCursor, totalCount };
}
