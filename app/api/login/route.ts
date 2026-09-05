import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { getDummyHash, verifyPassword } from "@/lib/auth/password";
import {
  createSession,
  getSessionDurationSeconds,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";
import { userRepository } from "@/lib/repositories/user-repository";
import { loginSchema } from "@/lib/validation/auth";
import {
  checkRateLimit,
  getClientIpKey,
  isBodyTooLarge,
  resetRateLimit,
} from "@/lib/api/rate-limit";
import { auditLogRepository } from "@/lib/repositories/audit-log-repository";
import { serverSettingsRepository } from "@/lib/repositories/server-settings-repository";
import { issuePendingTotpToken } from "@/lib/auth/totp-pending-token";
import { parseJsonBody, tooManyRequests } from "@/lib/api/api-guards";
import { MAX_BODY_BYTES, RATE_LIMIT_BACKOFF, SESSION } from "@/lib/config";

export async function POST(request: Request): Promise<NextResponse> {
  const t = await getTranslations("Api");

  if (isBodyTooLarge(request, MAX_BODY_BYTES.login)) {
    return NextResponse.json({ error: t("invalidRequest") }, { status: 413 });
  }

  const rateLimitKey = `login:${getClientIpKey(request)}`;
  const { allowed, retryAfterSeconds } = await checkRateLimit(
    rateLimitKey,
    RATE_LIMIT_BACKOFF.login,
  );
  if (!allowed) {
    return tooManyRequests(retryAfterSeconds, t("tooManyRequests"));
  }

  const parsedBody = await parseJsonBody(
    request,
    loginSchema,
    t("invalidRequest"),
  );
  if (parsedBody instanceof NextResponse) return parsedBody;
  const parsed = parsedBody;

  const username = parsed.data.email;
  const user = await userRepository.findByUsername(username);
  // Always runs a real argon2 verify against a dummy hash even for a nonexistent user, so timing can't reveal which is true.
  const passwordValid = await verifyPassword(
    user?.passwordHash ?? (await getDummyHash()),
    parsed.data.password,
  );
  if (!user || !passwordValid) {
    // Same generic error for "no such user" and "wrong password" - a distinct message would let an attacker enumerate usernames.
    return NextResponse.json(
      { error: t("invalidCredentials") },
      { status: 401 },
    );
  }

  if (user.suspended) {
    const error = user.suspendedReason
      ? t("accountSuspendedWithReason", { reason: user.suspendedReason })
      : t("accountSuspended");
    return NextResponse.json({ error }, { status: 403 });
  }

  const { maintenanceMode } = await serverSettingsRepository.get();
  if (maintenanceMode && user.role !== "ADMIN") {
    return NextResponse.json({ error: t("maintenanceMode") }, { status: 503 });
  }

  await resetRateLimit(rateLimitKey);
  const stayLoggedIn = parsed.data.stayLoggedIn ?? false;

  // 2FA required: no session yet, just a pending token for /api/login/totp.
  if (user.totpEnabled) {
    return NextResponse.json({
      requiresTotp: true,
      pendingToken: issuePendingTotpToken(user.id, stayLoggedIn),
    });
  }

  await auditLogRepository.record({
    actorId: user.id,
    actorUsername: user.username,
    action: "USER_LOGIN",
    targetId: user.id,
  });
  const [token, maxAge] = await Promise.all([
    createSession(
      user.id,
      stayLoggedIn ? undefined : SESSION.shortDurationSeconds,
    ),
    stayLoggedIn
      ? getSessionDurationSeconds()
      : Promise.resolve(SESSION.shortDurationSeconds),
  ]);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // Session-only cookie (no maxAge) unless staying logged in, where maxAge matches the JWT's own expiry.
    ...(stayLoggedIn ? { maxAge } : {}),
  });
  return response;
}
