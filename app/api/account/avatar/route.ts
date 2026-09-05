import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { userRepository } from "@/lib/repositories/user-repository";
import { auditLogRepository } from "@/lib/repositories/audit-log-repository";
import {
  deleteAvatarFile,
  extensionForMimeType,
  saveAvatarFile,
  sniffImageMimeType,
} from "@/lib/services/avatar-storage";
import { avatarUrlSchema } from "@/lib/validation/avatar";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { serverSettingsRepository } from "@/lib/repositories/server-settings-repository";
import { requireUser, parseJsonBody, tooManyRequests } from "@/lib/api/api-guards";
import { RATE_LIMIT_BACKOFF } from "@/lib/config";

export async function POST(request: Request): Promise<NextResponse> {
  const t = await getTranslations("Api");
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  // Keyed per account, not per IP: authenticated, so the thing worth capping is one account repeatedly writing to disk.
  const { allowed, retryAfterSeconds } = await checkRateLimit(
    `avatar:${user.id}`,
    RATE_LIMIT_BACKOFF.accountAvatar,
  );
  if (!allowed) {
    return tooManyRequests(retryAfterSeconds, t("tooManyRequests"));
  }

  const { avatarsEnabled, allowAvatarUrl, maxAvatarBytes } =
    await serverSettingsRepository.get();
  if (!avatarsEnabled) {
    return NextResponse.json({ error: t("avatar.disabled") }, { status: 403 });
  }
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    if (!allowAvatarUrl) {
      return NextResponse.json(
        { error: t("avatar.urlNotAllowed") },
        { status: 403 },
      );
    }
    const parsedBody = await parseJsonBody(
      request,
      avatarUrlSchema,
      t("avatar.invalidUrl"),
    );
    if (parsedBody instanceof NextResponse) return parsedBody;
    const parsed = parsedBody;
    await deleteAvatarFile(user.id);
    await userRepository.updateAvatar(user.id, parsed.data.url);
    await auditLogRepository.record({
      actorId: user.id,
      actorUsername: user.username,
      action: "AVATAR_CHANGED",
      targetId: user.id,
      metadata: { source: "url" },
    });
    return NextResponse.json({ avatarUrl: parsed.data.url });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: t("invalidRequest") }, { status: 400 });
  }
  if (!extensionForMimeType(file.type)) {
    return NextResponse.json(
      { error: t("avatar.invalidType") },
      { status: 400 },
    );
  }
  if (file.size > maxAvatarBytes) {
    return NextResponse.json({ error: t("avatar.tooLarge") }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  // The declared Content-Type is only a pre-check; the real gate is against the file's actual bytes here.
  const sniffedType = sniffImageMimeType(buffer);
  if (!sniffedType || !extensionForMimeType(sniffedType)) {
    return NextResponse.json(
      { error: t("avatar.invalidType") },
      { status: 400 },
    );
  }

  await saveAvatarFile(user.id, buffer, sniffedType);
  // The served path is otherwise identical across uploads, so a version query param cache-busts it after every change.
  const avatarUrl = `/api/avatar/${user.id}?v=${Date.now()}`;
  await userRepository.updateAvatar(user.id, avatarUrl);
  await auditLogRepository.record({
    actorId: user.id,
    actorUsername: user.username,
    action: "AVATAR_CHANGED",
    targetId: user.id,
    metadata: { source: "upload" },
  });
  return NextResponse.json({ avatarUrl });
}

export async function DELETE(): Promise<NextResponse> {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  await deleteAvatarFile(user.id);
  await userRepository.updateAvatar(user.id, null);
  await auditLogRepository.record({
    actorId: user.id,
    actorUsername: user.username,
    action: "AVATAR_CHANGED",
    targetId: user.id,
    metadata: { source: "removed" },
  });
  return NextResponse.json({ ok: true });
}
