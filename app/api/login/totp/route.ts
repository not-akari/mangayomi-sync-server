import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import {
  createSession,
  getSessionDurationSeconds,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";
import { userRepository } from "@/lib/repositories/user-repository";
import { verifyTotpCode, hashRecoveryCode } from "@/lib/auth/totp";
import { decryptSecret } from "@/lib/auth/secret-crypto";
import { verifyPendingTotpToken } from "@/lib/auth/totp-pending-token";
import { auditLogRepository } from "@/lib/repositories/audit-log-repository";
import { checkRateLimit, isBodyTooLarge } from "@/lib/api/rate-limit";
import { loginTotpSchema } from "@/lib/validation/totp";
import { parseJsonBody, tooManyRequests } from "@/lib/api/api-guards";
import { MAX_BODY_BYTES, RATE_LIMIT_BACKOFF, SESSION } from "@/lib/config";

// Step two of a 2FA login: exchanges a pending token plus a code for a session.
export async function POST(request: Request): Promise<NextResponse> {
  const t = await getTranslations("Api");

  if (isBodyTooLarge(request, MAX_BODY_BYTES.loginTotp)) {
    return NextResponse.json({ error: t("invalidRequest") }, { status: 413 });
  }

  const parsedBody = await parseJsonBody(
    request,
    loginTotpSchema,
    t("invalidRequest"),
  );
  if (parsedBody instanceof NextResponse) return parsedBody;
  const { pendingToken, code } = parsedBody.data;

  const pending = verifyPendingTotpToken(pendingToken);
  if (!pending) {
    return NextResponse.json({ error: t("invalidRequest") }, { status: 400 });
  }

  // Keyed per account, not per IP.
  const { allowed, retryAfterSeconds } = await checkRateLimit(
    `login-totp:${pending.userId}`,
    RATE_LIMIT_BACKOFF.loginTotp,
  );
  if (!allowed) {
    return tooManyRequests(retryAfterSeconds, t("tooManyRequests"));
  }

  const user = await userRepository.findById(pending.userId);
  if (!user || !user.totpEnabled || !user.totpSecret || user.suspended) {
    return NextResponse.json({ error: t("invalidRequest") }, { status: 400 });
  }

  const isTotpCode = /^\d{6}$/.test(code);
  let usedRecoveryCode = false;
  let recoveryCodesRemaining: number | undefined;
  if (isTotpCode) {
    if (!verifyTotpCode(decryptSecret(user.totpSecret), code)) {
      return NextResponse.json(
        { error: t("totp.invalidCode") },
        { status: 401 },
      );
    }
  } else {
    const remaining = await userRepository.consumeTotpRecoveryCodeHash(
      user.id,
      hashRecoveryCode(code),
    );
    if (remaining === null) {
      return NextResponse.json(
        { error: t("totp.invalidCode") },
        { status: 401 },
      );
    }
    usedRecoveryCode = true;
    recoveryCodesRemaining = remaining;
  }

  await auditLogRepository.record({
    actorId: user.id,
    actorUsername: user.username,
    action: "USER_LOGIN",
    targetId: user.id,
  });
  if (usedRecoveryCode) {
    await auditLogRepository.record({
      actorId: user.id,
      actorUsername: user.username,
      action: "TOTP_RECOVERY_CODE_USED",
      targetId: user.id,
    });
  }

  const [token, maxAge] = await Promise.all([
    createSession(
      user.id,
      pending.stayLoggedIn ? undefined : SESSION.shortDurationSeconds,
    ),
    pending.stayLoggedIn
      ? getSessionDurationSeconds()
      : Promise.resolve(SESSION.shortDurationSeconds),
  ]);

  const response = NextResponse.json({
    ok: true,
    recoveryCodesRemaining,
  });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(pending.stayLoggedIn ? { maxAge } : {}),
  });
  return response;
}
