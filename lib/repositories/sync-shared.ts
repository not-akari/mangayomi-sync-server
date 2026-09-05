import type {
  categorySchema,
  chapterSchema,
  historySchema,
  mangaSchema,
  syncRequestSchema,
  trackSchema,
  updateSchema,
} from "@/lib/validation/sync";
import type { z } from "zod";
import type {
  ItemType,
  Prisma,
  Status,
  TrackStatus,
} from "@prisma/client";

// Wire shapes for the pull side, mirroring the request schemas but as plain interfaces built from Prisma results.
export interface WireCategory {
  clientId: number;
  name: string;
  forItemType: ItemType;
  pos: number | null;
  hide: boolean;
  shouldUpdate: boolean;
  updatedAt: number;
}
export interface WireManga {
  clientId: number;
  source: string | null;
  sourceId: number | null;
  link: string | null;
  itemType: ItemType;
  name: string | null;
  imageUrl: string | null;
  description: string | null;
  author: string | null;
  artist: string | null;
  status: Status;
  genre: string[];
  lang: string | null;
  lastUpdate: number | null;
  favorite: boolean;
  dateAdded: number | null;
  lastRead: number | null;
  isLocalArchive: boolean;
  customCoverFromTracker: string | null;
  smartUpdateDays: number | null;
  updatedAt: number;
}
export interface WireChapter {
  clientId: number;
  mangaClientId: number;
  name: string | null;
  url: string | null;
  scanlator: string | null;
  dateUpload: number | null;
  isFiller: boolean;
  thumbnailUrl: string | null;
  description: string | null;
  downloadSize: number | null;
  duration: number | null;
  isRead: boolean;
  isBookmarked: boolean;
  lastPageRead: string | null;
  updatedAt: number;
}
export interface WireTrack {
  clientId: number;
  mangaClientId: number;
  syncId: number | null;
  mediaId: number | null;
  libraryId: number | null;
  title: string | null;
  lastChapterRead: number | null;
  totalChapter: number | null;
  score: number | null;
  status: TrackStatus;
  startedReadingDate: string | null;
  finishedReadingDate: string | null;
  trackingUrl: string | null;
  itemType: ItemType;
  updatedAt: number;
}
export interface WireHistory {
  clientId: number;
  mangaClientId: number;
  chapterClientId: number;
  itemType: ItemType;
  date: number | null;
  readingTimeSeconds: number;
  updatedAt: number;
}
export interface WireUpdate {
  clientId: number;
  mangaClientId: number;
  chapterName: string | null;
  date: number | null;
  updatedAt: number;
}
export interface WireSettings {
  data: Prisma.JsonValue;
  updatedAt: number;
}
export interface WireTombstones {
  categories: number[];
  manga: number[];
  chapters: number[];
  tracks: number[];
  histories: number[];
  updates: number[];
}

export type CategoryInput = z.infer<typeof categorySchema>;
export type MangaInput = z.infer<typeof mangaSchema>;
export type ChapterInput = z.infer<typeof chapterSchema>;
export type TrackInput = z.infer<typeof trackSchema>;
export type HistoryInput = z.infer<typeof historySchema>;
export type UpdateInput = z.infer<typeof updateSchema>;
export type SyncRequest = z.infer<typeof syncRequestSchema>;

export function toBigIntMs(n: number): bigint {
  return BigInt(Math.trunc(n));
}
export function toBigIntMsOrNull(n: number | null | undefined): bigint | null {
  return n === null || n === undefined ? null : toBigIntMs(n);
}
export function fromBigIntMs(n: bigint): number {
  return Number(n);
}
export function fromBigIntMsOrNull(n: bigint | null): number | null {
  return n === null ? null : Number(n);
}

// clientId is BigInt in the DB but stays a plain number on the wire, kept within MAX_SAFE_INTEGER by the client/zod schema.
export function toBigIntId(n: number): bigint {
  return BigInt(n);
}
export function fromBigIntId(n: bigint): number {
  return Number(n);
}

// Only overwrites when the incoming row is actually newer, and reports whether it was so the pull side can skip echoing it back.
export async function upsertIfNewer<Row extends { id: bigint; updatedAt: bigint }>(
  find: () => Promise<Row | null>,
  create: () => Promise<Row>,
  update: (existing: Row) => Promise<Row>,
  incomingUpdatedAt: bigint,
): Promise<{ id: bigint; applied: boolean }> {
  const existing = await find();
  if (!existing) {
    const row = await create();
    return { id: row.id, applied: true };
  }
  if (incomingUpdatedAt > existing.updatedAt) {
    const row = await update(existing);
    return { id: row.id, applied: true };
  }
  return { id: existing.id, applied: false };
}

// Catalog dedup (server-internal, see docs/sync_api.md)
