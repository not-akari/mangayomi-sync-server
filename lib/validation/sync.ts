import { z } from "zod";
import { SYNC } from "@/lib/config";

// Every "updatedAt" field is a client-side epoch millisecond timestamp, converted to/from BigInt at the repository boundary.

// Client-generated, stable across syncs for the same row, wide enough for negligible collisions. See sync-repository.ts's toBigIntId.
const clientIdSchema = z.number().int().safe().positive();
// No real library organizes one title into more than a handful of folders; this only guards against a malformed payload.
const MAX_CATEGORIES_PER_MANGA = 200;
const itemTypeSchema = z.enum(["MANGA", "ANIME", "NOVEL"]);
const statusSchema = z.enum([
  "ONGOING",
  "COMPLETED",
  "CANCELED",
  "UNKNOWN",
  "ON_HIATUS",
  "PUBLISHING_FINISHED",
]);
const trackStatusSchema = z.enum([
  "READING",
  "COMPLETED",
  "ON_HOLD",
  "DROPPED",
  "PLAN_TO_READ",
  "RE_READING",
  "WATCHING",
  "PLAN_TO_WATCH",
  "RE_WATCHING",
]);

export const categorySchema = z.object({
  clientId: clientIdSchema,
  name: z.string().max(200),
  forItemType: itemTypeSchema,
  pos: z.number().int().nullable().optional(),
  hide: z.boolean().optional(),
  shouldUpdate: z.boolean().optional(),
  updatedAt: z.number(),
});

// Catalog and per-user fields arrive together, flat - the server splits them into CatalogEntry vs Manga internally.
export const mangaSchema = z.object({
  clientId: clientIdSchema,
  source: z.string().max(200).nullable().optional(),
  sourceId: z.number().int().nullable().optional(),
  link: z.string().max(2000).nullable().optional(),
  itemType: itemTypeSchema,
  name: z.string().max(500).nullable().optional(),
  imageUrl: z.string().max(2000).nullable().optional(),
  description: z.string().max(10000).nullable().optional(),
  author: z.string().max(500).nullable().optional(),
  artist: z.string().max(500).nullable().optional(),
  status: statusSchema.optional(),
  genre: z.array(z.string().max(100)).optional(),
  lang: z.string().max(20).nullable().optional(),
  lastUpdate: z.number().nullable().optional(),
  favorite: z.boolean().optional(),
  dateAdded: z.number().nullable().optional(),
  lastRead: z.number().nullable().optional(),
  isLocalArchive: z.boolean().optional(),
  customCoverFromTracker: z.string().max(2000).nullable().optional(),
  smartUpdateDays: z.number().int().nullable().optional(),
  // The full set of categories this manga belongs to, replacing whatever MangaCategory
  // rows exist server-side for it. Omitted means "leave links untouched" (an older or
  // partial client that doesn't know about this field), an empty array means "in no category".
  categoryClientIds: z
    .array(clientIdSchema)
    .max(MAX_CATEGORIES_PER_MANGA)
    .optional(),
  updatedAt: z.number(),
});

// Same flattening as manga: CatalogChapter and per-user ChapterState fields together.
export const chapterSchema = z.object({
  clientId: clientIdSchema,
  mangaClientId: clientIdSchema,
  name: z.string().max(500).nullable().optional(),
  url: z.string().max(2000).nullable().optional(),
  scanlator: z.string().max(200).nullable().optional(),
  dateUpload: z.number().nullable().optional(),
  isFiller: z.boolean().optional(),
  thumbnailUrl: z.string().max(2000).nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  downloadSize: z.number().int().nullable().optional(),
  duration: z.number().int().nullable().optional(),
  isRead: z.boolean().optional(),
  isBookmarked: z.boolean().optional(),
  lastPageRead: z.string().max(50).nullable().optional(),
  updatedAt: z.number(),
});

export const trackSchema = z.object({
  clientId: clientIdSchema,
  mangaClientId: clientIdSchema,
  syncId: z.number().int().nullable().optional(),
  mediaId: z.number().int().nullable().optional(),
  libraryId: z.number().int().nullable().optional(),
  title: z.string().max(500).nullable().optional(),
  lastChapterRead: z.number().nullable().optional(),
  totalChapter: z.number().int().nullable().optional(),
  score: z.number().nullable().optional(),
  status: trackStatusSchema.optional(),
  startedReadingDate: z.number().nullable().optional(),
  finishedReadingDate: z.number().nullable().optional(),
  trackingUrl: z
    .string()
    .max(2000)
    .refine((v) => v === "" || /^https?:\/\//.test(v), "Must be http(s)")
    .nullable()
    .optional(),
  itemType: itemTypeSchema,
  updatedAt: z.number(),
});

export const historySchema = z.object({
  clientId: clientIdSchema,
  mangaClientId: clientIdSchema,
  chapterClientId: clientIdSchema,
  itemType: itemTypeSchema,
  date: z.number().nullable().optional(),
  readingTimeSeconds: z.number().int().optional(),
  updatedAt: z.number(),
});

export const updateSchema = z.object({
  clientId: clientIdSchema,
  mangaClientId: clientIdSchema,
  chapterName: z.string().max(500).nullable().optional(),
  date: z.number().nullable().optional(),
  updatedAt: z.number(),
});

const MAX_ROWS_PER_ENTITY = SYNC.maxRowsPerEntity;

const deletedSchema = z.object({
  categories: z.array(clientIdSchema).max(MAX_ROWS_PER_ENTITY).optional(),
  manga: z.array(clientIdSchema).max(MAX_ROWS_PER_ENTITY).optional(),
  chapters: z.array(clientIdSchema).max(MAX_ROWS_PER_ENTITY).optional(),
  tracks: z.array(clientIdSchema).max(MAX_ROWS_PER_ENTITY).optional(),
  histories: z.array(clientIdSchema).max(MAX_ROWS_PER_ENTITY).optional(),
  updates: z.array(clientIdSchema).max(MAX_ROWS_PER_ENTITY).optional(),
});

// Opaque per-entity resume token echoed back verbatim to fetch the next page when a library is too large for one.
const cursorsSchema = z.object({
  categories: z.string().nullable().optional(),
  manga: z.string().nullable().optional(),
  chapters: z.string().nullable().optional(),
  tracks: z.string().nullable().optional(),
  histories: z.string().nullable().optional(),
  updates: z.string().nullable().optional(),
  tombstones: z.string().nullable().optional(),
});

export const syncRequestSchema = z.object({
  since: z.number().int().min(0).optional(),
  cursors: cursorsSchema.optional(),
  // Proves this call continues an already-checked sync operation, exempting it from the fresh-start rate limit.
  sessionToken: z.string().max(500).optional(),
  categories: z.array(categorySchema).max(MAX_ROWS_PER_ENTITY).optional(),
  manga: z.array(mangaSchema).max(MAX_ROWS_PER_ENTITY).optional(),
  chapters: z.array(chapterSchema).max(MAX_ROWS_PER_ENTITY).optional(),
  tracks: z.array(trackSchema).max(MAX_ROWS_PER_ENTITY).optional(),
  histories: z.array(historySchema).max(MAX_ROWS_PER_ENTITY).optional(),
  updates: z.array(updateSchema).max(MAX_ROWS_PER_ENTITY).optional(),
  // Opaque client-defined blob (~100+ fields), validated only as "is an object" - same reasoning as jsonb over typed columns.
  settings: z
    .object({ data: z.record(z.string(), z.unknown()), updatedAt: z.number() })
    .nullable()
    .optional(),
  deleted: deletedSchema.optional(),
});

export type SyncRequest = z.infer<typeof syncRequestSchema>;
