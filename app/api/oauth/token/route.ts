import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { oauthRepository } from "@/lib/repositories/oauth-repository";
import { userRepository } from "@/lib/repositories/user-repository";
import { challengeFromVerifier } from "@/lib/auth/oauth";
import { createSession, getSessionDurationSeconds } from "@/lib/auth/session";
import { auditLogRepository } from "@/lib/repositories/audit-log-repository";
import { serverSettingsRepository } from "@/lib/repositories/server-settings-repository";
import {
  checkRateLimit,
  getClientIpKey,
  isBodyTooLarge,
} from "@/lib/api/rate-limit";
import { oauthTokenSchema } from "@/lib/validation/oauth";
import { parseJsonBody, tooManyRequests } from "@/lib/api/api-guards";
import { MAX_BODY_BYTES, RATE_LIMIT_BACKOFF } from "@/lib/config";

// PKCE exchange: trades the authorization code and verifier for a session token.
export async function POST(request: Request): Promise<NextResponse> {
  const t = await getTranslations("Api");

  if (isBodyTooLarge(request, MAX_BODY_BYTES.oauthToken)) {
    return NextResponse.json({ error: t("invalidRequest") }, { status: 413 });
  }

  const { allowed, retryAfterSeconds } = await checkRateLimit(
    `oauth-token:${getClientIpKey(request)}`,
    RATE_LIMIT_BACKOFF.oauthToken,
  );
  if (!allowed) {
    return tooManyRequests(retryAfterSeconds, t("tooManyRequests"));
  }

  const parsedBody = await parseJsonBody(
    request,
    oauthTokenSchema,
    t("invalidRequest"),
  );
  if (parsedBody instanceof NextResponse) return parsedBody;
  const { code, codeVerifier, redirectUri } = parsedBody.data;

  const record = await oauthRepository.consume(code);
  if (
    !record ||
    record.redirectUri !== redirectUri ||
    record.codeChallenge !== challengeFromVerifier(codeVerifier)
  ) {
    return NextResponse.json({ error: t("invalidRequest") }, { status: 400 });
  }

  const user = await userRepository.findById(record.userId);
  if (!user || user.suspended) {
    return NextResponse.json({ error: t("invalidRequest") }, { status: 400 });
  }

  const { maintenanceMode } = await serverSettingsRepository.get();
  if (maintenanceMode && user.role !== "ADMIN") {
    return NextResponse.json({ error: t("maintenanceMode") }, { status: 503 });
  }

  const [token, expiresIn] = await Promise.all([
    createSession(user.id),
    getSessionDurationSeconds(),
  ]);
  await auditLogRepository.record({
    actorId: user.id,
    actorUsername: user.username,
    action: "USER_LOGIN",
    targetId: user.id,
    metadata: { method: "oauth" },
  });

  // Same JWT a password login would issue.
  return NextResponse.json({
    access_token: token,
    token_type: "Bearer",
    expires_in: expiresIn,
    username: user.username,
  });
}
