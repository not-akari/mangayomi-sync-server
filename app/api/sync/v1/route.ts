import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { withTransaction } from "@/lib/repositories/transaction";
import { syncRequestSchema } from "@/lib/validation/sync";
import { checkFixedWindowLimit, isBodyTooLarge } from "@/lib/api/rate-limit";
import {
  requireUser,
  parseJsonBody,
  tooManyRequests,
} from "@/lib/api/api-guards";
import {
  issueSyncSessionToken,
  verifySyncSessionToken,
} from "@/lib/auth/sync-session-token";
import {
  applyDeletions,
  decodeCursor,
  pullCategories,
  pullChapters,
  pullHistories,
  pullManga,
  pullSettings,
  pullTombstones,
  pullTracks,
  pullUpdates,
  resolveExistingCategoryIds,
  resolveExistingChapterIds,
  resolveExistingMangaIds,
  upsertCategories,
  upsertChapters,
  upsertHistories,
  upsertManga,
  upsertSettingsRow,
  upsertTracks,
  upsertUpdates,
} from "@/lib/repositories/sync-repository";
import { MAX_BODY_BYTES, SYNC } from "@/lib/config";

export async function POST(request: Request): Promise<NextResponse> {
  const t = await getTranslations("Api");
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  if (isBodyTooLarge(request, MAX_BODY_BYTES.sync)) {
    return NextResponse.json({ error: t("requestTooLarge") }, { status: 413 });
  }

  const parsedBody = await parseJsonBody(
    request,
    syncRequestSchema,
    t("invalidRequest"),
  );
  if (parsedBody instanceof NextResponse) return parsedBody;
  const req = parsedBody.data;
  const since = BigInt(req.since ?? 0);
  const userId = user.id;

  const dailyCheck = await checkFixedWindowLimit(
    `sync-daily:${userId}`,
    SYNC.dailyCircuitBreaker,
  );
  if (!dailyCheck.allowed) {
    return tooManyRequests(dailyCheck.retryAfterSeconds, t("syncTooManyToday"));
  }

  const isContinuation = verifySyncSessionToken(req.sessionToken, userId);
  if (!isContinuation) {
    const freshCheck = await checkFixedWindowLimit(
      `sync-fresh:${userId}`,
      SYNC.freshLimit,
    );
    if (!freshCheck.allowed) {
      return tooManyRequests(freshCheck.retryAfterSeconds, t("syncTooManyNow"));
    }
  }

  const result = await withTransaction(
    async (client) => {
      const now = BigInt(Date.now());

      const { applied: appliedCategories, idByClientId: categoryIds } = req
        .categories?.length
        ? await upsertCategories(client, userId, req.categories)
        : {
            applied: new Set<number>(),
            idByClientId: new Map<number, bigint>(),
          };

      // Categories a manga upload references but that weren't themselves part of this
      // upload (synced in an earlier cycle already).
      const referencedCategoryClientIds = new Set<number>();
      for (const m of req.manga ?? [])
        for (const cid of m.categoryClientIds ?? [])
          referencedCategoryClientIds.add(cid);
      const missingCategoryClientIds = [...referencedCategoryClientIds].filter(
        (id) => !categoryIds.has(id),
      );
      const existingCategoryIds = await resolveExistingCategoryIds(
        client,
        userId,
        missingCategoryClientIds,
      );
      for (const [clientId, id] of existingCategoryIds)
        categoryIds.set(clientId, id);

      const {
        applied: appliedManga,
        idByClientId: mangaIds,
        remap: mangaClientIdRemap,
      } = req.manga?.length
        ? await upsertManga(client, userId, req.manga, categoryIds)
        : {
            applied: new Set<number>(),
            idByClientId: new Map<number, bigint>(),
            remap: new Map<number, number>(),
          };

      // Every other entity type references manga by clientId, including ones synced in an earlier cycle.
      const referencedMangaClientIds = new Set<number>();
      for (const c of req.chapters ?? [])
        referencedMangaClientIds.add(c.mangaClientId);
      for (const t of req.tracks ?? [])
        referencedMangaClientIds.add(t.mangaClientId);
      for (const h of req.histories ?? [])
        referencedMangaClientIds.add(h.mangaClientId);
      for (const u of req.updates ?? [])
        referencedMangaClientIds.add(u.mangaClientId);
      const missingMangaClientIds = [...referencedMangaClientIds].filter(
        (id) => !mangaIds.has(id),
      );
      const existingMangaIds = await resolveExistingMangaIds(
        client,
        userId,
        missingMangaClientIds,
      );
      for (const [clientId, id] of existingMangaIds) mangaIds.set(clientId, id);

      const {
        applied: appliedChapters,
        idByClientId: chapterIds,
        remap: chapterClientIdRemap,
      } = req.chapters?.length
        ? await upsertChapters(client, userId, req.chapters, mangaIds)
        : {
            applied: new Set<number>(),
            idByClientId: new Map<number, bigint>(),
            remap: new Map<number, number>(),
          };

      const referencedChapterClientIds = new Set<number>();
      for (const h of req.histories ?? [])
        referencedChapterClientIds.add(h.chapterClientId);
      const missingChapterClientIds = [...referencedChapterClientIds].filter(
        (id) => !chapterIds.has(id),
      );
      const existingChapterIds = await resolveExistingChapterIds(
        client,
        userId,
        missingChapterClientIds,
      );
      for (const [clientId, id] of existingChapterIds)
        chapterIds.set(clientId, id);

      const appliedTracks = req.tracks?.length
        ? await upsertTracks(client, userId, req.tracks, mangaIds)
        : new Set<number>();
      const appliedHistories = req.histories?.length
        ? await upsertHistories(
            client,
            userId,
            req.histories,
            mangaIds,
            chapterIds,
          )
        : new Set<number>();
      const appliedUpdates = req.updates?.length
        ? await upsertUpdates(client, userId, req.updates, mangaIds)
        : new Set<number>();

      if (req.settings) {
        await upsertSettingsRow(client, userId, req.settings);
      }

      await applyDeletions(client, userId, req.deleted, now);

      const [
        categories,
        manga,
        chapters,
        tracks,
        histories,
        updates,
        settings,
        tombstonesPage,
      ] = await Promise.all([
        pullCategories(
          client,
          userId,
          since,
          decodeCursor(req.cursors?.categories),
          appliedCategories,
        ),
        pullManga(
          client,
          userId,
          since,
          decodeCursor(req.cursors?.manga),
          appliedManga,
        ),
        pullChapters(
          client,
          userId,
          since,
          decodeCursor(req.cursors?.chapters),
          appliedChapters,
        ),
        pullTracks(
          client,
          userId,
          since,
          decodeCursor(req.cursors?.tracks),
          appliedTracks,
        ),
        pullHistories(
          client,
          userId,
          since,
          decodeCursor(req.cursors?.histories),
          appliedHistories,
        ),
        pullUpdates(
          client,
          userId,
          since,
          decodeCursor(req.cursors?.updates),
          appliedUpdates,
        ),
        pullSettings(client, userId, since),
        pullTombstones(
          client,
          userId,
          since,
          decodeCursor(req.cursors?.tombstones),
        ),
      ]);

      // Only trust `now` as the new watermark once every entity has fully caught up, or a mid-pagination client would skip rows.
      const hasMore =
        categories.hasMore ||
        manga.hasMore ||
        chapters.hasMore ||
        tracks.hasMore ||
        histories.hasMore ||
        updates.hasMore ||
        tombstonesPage.hasMore;

      return {
        syncedAt: hasMore ? null : Number(now),
        hasMore,
        // Reissued on every response so the client always has a fresh, unexpired token for its next call.
        sessionToken: issueSyncSessionToken(userId),
        cursors: {
          categories: categories.nextCursor,
          manga: manga.nextCursor,
          chapters: chapters.nextCursor,
          tracks: tracks.nextCursor,
          histories: histories.nextCursor,
          updates: updates.nextCursor,
          tombstones: tombstonesPage.nextCursor,
        },
        // Only populated on each entity's first page, omitted rather than null on later pages.
        totalCounts: {
          categories: categories.totalCount,
          manga: manga.totalCount,
          chapters: chapters.totalCount,
          tracks: tracks.totalCount,
          histories: histories.totalCount,
          updates: updates.totalCount,
          tombstones: tombstonesPage.totalCount,
        },
        categories: categories.rows,
        manga: manga.rows,
        chapters: chapters.rows,
        tracks: tracks.rows,
        histories: histories.rows,
        updates: updates.rows,
        settings,
        tombstones: tombstonesPage.entities,
        // Tells the client the manga it just sent already exists under a different clientId - rewrite to adopt it. Only present when non-empty.
        ...(mangaClientIdRemap.size > 0
          ? { mangaClientIdRemap: Object.fromEntries(mangaClientIdRemap) }
          : {}),
        // Same as mangaClientIdRemap, for a chapter tracked independently on two devices.
        ...(chapterClientIdRemap.size > 0
          ? { chapterClientIdRemap: Object.fromEntries(chapterClientIdRemap) }
          : {}),
      };
    },
    { timeoutMs: SYNC.transactionTimeoutMs },
  );

  return NextResponse.json(result);
}
