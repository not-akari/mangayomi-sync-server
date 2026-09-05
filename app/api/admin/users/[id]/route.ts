import { NextResponse } from "next/server";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { ADMIN_SCOPE_VALUES, isScopeSubset } from "@/lib/auth/permissions";
import { userRepository } from "@/lib/repositories/user-repository";
import { statsRepository } from "@/lib/repositories/stats-repository";
import { sessionRepository } from "@/lib/repositories/session-repository";
import { auditLogRepository } from "@/lib/repositories/audit-log-repository";
import { serverSettingsRepository } from "@/lib/repositories/server-settings-repository";
import { requireScope, parseJsonBody } from "@/lib/api/api-guards";

const updateSchema = z.object({
  role: z.enum(["USER", "ADMIN"]),
  scopes: z.array(z.enum(ADMIN_SCOPE_VALUES)).optional(),
  suspended: z.boolean().optional(),
  suspendedReason: z.string().trim().max(500).nullable().optional(),
  maxLibraryBytesOverride: z.number().int().positive().nullable().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const t = await getTranslations("Api");
  const user = await requireScope("MANAGE_USERS");
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  const target = await userRepository.findById(id);
  if (!target) {
    return NextResponse.json({ error: t("notFound") }, { status: 404 });
  }

  const [stats, dataSizeBytes, settings] = await Promise.all([
    statsRepository.userLibraryStats(id),
    statsRepository.userDataSizeBytes(id),
    serverSettingsRepository.get(),
  ]);
  return NextResponse.json({
    user: {
      id: target.id,
      username: target.username,
      // Whether one's on file, never the address itself - admins just need to know if email recovery is reachable.
      hasEmail: Boolean(target.email),
      isPrimaryAdmin: target.isPrimaryAdmin,
      avatarUrl: settings.avatarsEnabled ? target.avatarUrl : null,
      role: target.role,
      scopes: target.scopes,
      suspended: target.suspended,
      suspendedReason: target.suspendedReason,
      createdAt: target.createdAt,
      maxLibraryBytesOverride: target.maxLibraryBytesOverride,
    },
    stats: { ...stats, dataSizeBytes },
    defaultMaxLibraryBytes: settings.defaultMaxLibraryBytes,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const t = await getTranslations("Api");
  const user = await requireScope("MANAGE_USERS");
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  // Blocked, not just discouraged: a self-demotion here could permanently lock a single-admin instance out of its own panel.
  if (id === user.id) {
    return NextResponse.json(
      { error: t("cannotChangeOwnRole") },
      { status: 400 },
    );
  }

  const parsedBody = await parseJsonBody(
    request,
    updateSchema,
    t("invalidRequest"),
  );
  if (parsedBody instanceof NextResponse) return parsedBody;
  const parsed = parsedBody;

  const before = await userRepository.findById(id);
  if (!before) {
    return NextResponse.json({ error: t("notFound") }, { status: 404 });
  }
  // The primary (bootstrap) account is locked against every other admin, or a scoped MANAGE_USERS admin could demote the server owner.
  if (before.isPrimaryAdmin) {
    return NextResponse.json(
      { error: t("cannotModifyPrimaryAdmin") },
      { status: 403 },
    );
  }

  const scopes = parsed.data.role === "ADMIN" ? (parsed.data.scopes ?? []) : [];
  // Same rule as invite creation: can't grant another account more scope than you currently hold yourself.
  if (!isScopeSubset(scopes, user.scopes)) {
    return NextResponse.json(
      { error: t("forbiddenScope") },
      { status: 403 },
    );
  }

  const updated = await userRepository.updateRoleAndScopes(
    id,
    parsed.data.role,
    scopes,
  );
  await auditLogRepository.record({
    actorId: user.id,
    actorUsername: user.username,
    action: "ROLE_CHANGED",
    targetId: updated.id,
    metadata: { targetUsername: updated.username, newRole: updated.role },
  });

  let suspendedReason = before?.suspendedReason ?? null;
  if (
    parsed.data.suspended !== undefined &&
    parsed.data.suspended !== before?.suspended
  ) {
    const reasonUpdated = await userRepository.updateSuspended(
      id,
      parsed.data.suspended,
      parsed.data.suspendedReason ?? null,
    );
    suspendedReason = reasonUpdated.suspendedReason;
    if (parsed.data.suspended) {
      await sessionRepository.revokeAllForUser(id);
    }
    await auditLogRepository.record({
      actorId: user.id,
      actorUsername: user.username,
      action: parsed.data.suspended
        ? "ACCOUNT_SUSPENDED"
        : "ACCOUNT_REINSTATED",
      targetId: updated.id,
      metadata: {
        targetUsername: updated.username,
        ...(parsed.data.suspended && parsed.data.suspendedReason
          ? { reason: parsed.data.suspendedReason }
          : {}),
      },
    });
  }

  let maxLibraryBytesOverride = before?.maxLibraryBytesOverride ?? null;
  if (
    parsed.data.maxLibraryBytesOverride !== undefined &&
    parsed.data.maxLibraryBytesOverride !== before?.maxLibraryBytesOverride
  ) {
    const overrideUpdated = await userRepository.updateLibraryQuotaOverride(
      id,
      parsed.data.maxLibraryBytesOverride,
    );
    maxLibraryBytesOverride = overrideUpdated.maxLibraryBytesOverride;
  }

  return NextResponse.json({
    id: updated.id,
    role: updated.role,
    scopes: updated.scopes,
    suspended: parsed.data.suspended ?? before?.suspended ?? false,
    suspendedReason,
    maxLibraryBytesOverride,
  });
}
