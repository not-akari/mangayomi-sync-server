import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { getCurrentSessionId } from "@/lib/auth/auth";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { userRepository } from "@/lib/repositories/user-repository";
import { sessionRepository } from "@/lib/repositories/session-repository";
import { auditLogRepository } from "@/lib/repositories/audit-log-repository";
import { changePasswordSchema } from "@/lib/validation/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { serverSettingsRepository } from "@/lib/repositories/server-settings-repository";
import { requireUser, parseJsonBody, tooManyRequests } from "@/lib/api/api-guards";
import { RATE_LIMIT_BACKOFF } from "@/lib/config";

export async function PATCH(request: Request): Promise<NextResponse> {
  const t = await getTranslations("Api");
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const { allowed, retryAfterSeconds } = await checkRateLimit(
    `password-change:${user.id}`,
    RATE_LIMIT_BACKOFF.accountPassword,
  );
  if (!allowed) {
    return tooManyRequests(retryAfterSeconds, t("tooManyRequests"));
  }

  const parsedBody = await parseJsonBody(
    request,
    changePasswordSchema,
    t("invalidRequest"),
  );
  if (parsedBody instanceof NextResponse) return parsedBody;
  const parsed = parsedBody;

  const { minPasswordLength } = await serverSettingsRepository.get();
  if (parsed.data.newPassword.length < minPasswordLength) {
    return NextResponse.json(
      { error: t("passwordTooShort", { min: minPasswordLength }) },
      { status: 400 },
    );
  }

  const currentValid = await verifyPassword(
    user.passwordHash,
    parsed.data.currentPassword,
  );
  if (!currentValid) {
    return NextResponse.json(
      { error: t("currentPasswordIncorrect") },
      { status: 401 },
    );
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await userRepository.updatePassword(user.id, passwordHash);
  await auditLogRepository.record({
    actorId: user.id,
    actorUsername: user.username,
    action: "PASSWORD_CHANGED",
    targetId: user.id,
  });

  const currentSessionId = await getCurrentSessionId();
  if (currentSessionId) {
    await sessionRepository.revokeAllForUserExcept(user.id, currentSessionId);
  }

  return NextResponse.json({ ok: true });
}
