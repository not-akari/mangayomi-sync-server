import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import {
  inviteRepository,
  type InviteRedeemResult,
} from "@/lib/repositories/invite-repository";
import { userRepository } from "@/lib/repositories/user-repository";
import { withTransaction } from "@/lib/repositories/transaction";
import { hashPassword } from "@/lib/auth/password";
import {
  createSession,
  getSessionDurationSeconds,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";
import { registerSchema } from "@/lib/validation/auth";
import {
  checkRateLimit,
  getClientIp,
  getClientIpKey,
  isBodyTooLarge,
} from "@/lib/api/rate-limit";
import { hashIp } from "@/lib/auth/ip-hash";
import { auditLogRepository } from "@/lib/repositories/audit-log-repository";
import { serverSettingsRepository } from "@/lib/repositories/server-settings-repository";
import { ALL_ADMIN_SCOPES } from "@/lib/auth/permissions";
import { parseJsonBody, tooManyRequests } from "@/lib/api/api-guards";
import { MAX_BODY_BYTES, RATE_LIMIT_BACKOFF } from "@/lib/config";

const INVITE_ERROR_KEYS: Record<
  Exclude<InviteRedeemResult, { ok: true }>["reason"],
  string
> = {
  not_found: "invite.notFound",
  revoked: "invite.revoked",
  expired: "invite.expired",
  used_up: "invite.usedUp",
};

export async function POST(request: Request): Promise<NextResponse> {
  const t = await getTranslations("Api");

  if (isBodyTooLarge(request, MAX_BODY_BYTES.register)) {
    return NextResponse.json({ error: t("invalidRequest") }, { status: 413 });
  }

  const { allowed, retryAfterSeconds } = await checkRateLimit(
    `register:${getClientIpKey(request)}`,
    RATE_LIMIT_BACKOFF.register,
  );
  if (!allowed) {
    return tooManyRequests(retryAfterSeconds, t("tooManyRequests"));
  }

  const parsedBody = await parseJsonBody(
    request,
    registerSchema,
    t("invalidRequest"),
  );
  if (parsedBody instanceof NextResponse) return parsedBody;
  const parsed = parsedBody;

  const username = parsed.data.email;
  const existing = await userRepository.findByUsername(username);
  if (existing) {
    return NextResponse.json({ error: t("usernameTaken") }, { status: 409 });
  }

  // Hashed before it ever reaches the database, and compared as a hash too.
  const clientIpHash = hashIp(getClientIp(request));
  if (
    clientIpHash !== "unknown" &&
    (await userRepository.hasSuspendedUserWithIpHash(clientIpHash))
  ) {
    return NextResponse.json(
      { error: t("registrationBlocked") },
      { status: 403 },
    );
  }

  const { registrationMode, maintenanceMode, minPasswordLength } =
    await serverSettingsRepository.get();
  if (maintenanceMode) {
    return NextResponse.json({ error: t("maintenanceMode") }, { status: 503 });
  }
  if (parsed.data.password.length < minPasswordLength) {
    return NextResponse.json(
      { error: t("passwordTooShort", { min: minPasswordLength }) },
      { status: 400 },
    );
  }

  const passwordHash = await hashPassword(parsed.data.password);

  let userId: string;
  try {
    userId = await withTransaction(async (client) => {
      // The first account bootstraps itself with no invite code, since a code can only ever be created by an existing user.
      const isFirstAccount = (await userRepository.count(client)) === 0;

      const user = await userRepository.create(
        {
          username,
          passwordHash,
          role: isFirstAccount ? "ADMIN" : "USER",
          scopes: isFirstAccount ? ALL_ADMIN_SCOPES : [],
          isPrimaryAdmin: isFirstAccount,
          registeredIpHash: clientIpHash === "unknown" ? null : clientIpHash,
        },
        client,
      );
      await auditLogRepository.record(
        {
          actorId: user.id,
          actorUsername: user.username,
          action: "USER_REGISTERED",
          targetId: user.id,
        },
        client,
      );

      if (!isFirstAccount) {
        // Invite-only servers require a code; an open server only requires one if the registrant is actually using it.
        if (!parsed.data.inviteCode) {
          if (registrationMode === "INVITE_ONLY") {
            throw new InviteError("not_found");
          }
        } else {
          // Re-validated and consumed atomically inside the transaction, so two people racing the last use can't both succeed.
          const redemption = await inviteRepository.redeem(
            client,
            parsed.data.inviteCode,
            user.id,
          );
          if (!redemption.ok) {
            throw new InviteError(redemption.reason);
          }
          if (
            redemption.grantedRole !== "USER" ||
            redemption.grantedScopes.length > 0
          ) {
            await userRepository.updateRoleAndScopes(
              user.id,
              redemption.grantedRole,
              redemption.grantedScopes,
              client,
            );
          }
          if (redemption.maxLibraryBytesOverride !== null) {
            await userRepository.updateLibraryQuotaOverride(
              user.id,
              redemption.maxLibraryBytesOverride,
              client,
            );
          }
        }
      }

      return user.id;
    });
  } catch (error) {
    if (error instanceof InviteError) {
      return NextResponse.json(
        { error: t(INVITE_ERROR_KEYS[error.reason]) },
        { status: 400 },
      );
    }
    throw error;
  }

  const [token, maxAge] = await Promise.all([
    createSession(userId),
    getSessionDurationSeconds(),
  ]);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
  return response;
}

class InviteError extends Error {
  constructor(
    public reason: Exclude<InviteRedeemResult, { ok: true }>["reason"],
  ) {
    super(`Invite redemption failed: ${reason}`);
  }
}
