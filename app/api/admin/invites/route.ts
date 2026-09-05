import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { ADMIN_SCOPE_VALUES, isScopeSubset } from "@/lib/auth/permissions";
import { inviteRepository } from "@/lib/repositories/invite-repository";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { auditLogRepository } from "@/lib/repositories/audit-log-repository";
import { requireScope, parseJsonBody, tooManyRequests } from "@/lib/api/api-guards";
import { RATE_LIMIT_BACKOFF } from "@/lib/config";

const createSchema = z.object({
  maxUses: z.number().int().positive().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  label: z.string().max(200).nullable().optional(),
  grantedRole: z.enum(["USER", "ADMIN"]).optional(),
  grantedScopes: z.array(z.enum(ADMIN_SCOPE_VALUES)).optional(),
  maxLibraryBytesOverride: z.number().int().positive().nullable().optional(),
});

export async function GET(): Promise<NextResponse> {
  const user = await requireScope("MANAGE_INVITES");
  if (user instanceof NextResponse) return user;

  const invites = await inviteRepository.listAll();
  return NextResponse.json({ invites });
}

export async function POST(request: Request): Promise<NextResponse> {
  const t = await getTranslations("Api");
  const user = await requireScope("MANAGE_INVITES");
  if (user instanceof NextResponse) return user;

  const { allowed, retryAfterSeconds } = await checkRateLimit(
    `invite-create:${user.id}`,
    RATE_LIMIT_BACKOFF.adminInviteCreate,
  );
  if (!allowed) {
    return tooManyRequests(retryAfterSeconds, t("tooManyRequests"));
  }

  const parsedBody = await parseJsonBody(
    request,
    createSchema,
    t("invalidRequest"),
    {},
  );
  if (parsedBody instanceof NextResponse) return parsedBody;
  const parsed = parsedBody;

  const grantedScopes = parsed.data.grantedScopes ?? [];
  // Role is derived from scopes, not trusted from the client - admin-ness follows from holding any scope.
  const grantedRole = grantedScopes.length > 0 ? "ADMIN" : "USER";
  // Can't hand out an invite granting more than the creator holds, or a MANAGE_INVITES-only admin could mint full access.
  if (!isScopeSubset(grantedScopes, user.scopes)) {
    return NextResponse.json(
      { error: t("forbiddenScope") },
      { status: 403 },
    );
  }

  const invite = await inviteRepository.create({
    createdById: user.id,
    maxUses: parsed.data.maxUses,
    expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    label: parsed.data.label,
    grantedRole,
    grantedScopes,
    maxLibraryBytesOverride: parsed.data.maxLibraryBytesOverride,
  });
  await auditLogRepository.record({
    actorId: user.id,
    actorUsername: user.username,
    action: "INVITE_CREATED",
    targetId: invite.id,
    metadata: { code: invite.code },
  });
  return NextResponse.json({ invite }, { status: 201 });
}
