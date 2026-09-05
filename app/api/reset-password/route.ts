import { NextResponse } from "next/server";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { hashPassword } from "@/lib/auth/password";
import { userRepository } from "@/lib/repositories/user-repository";
import { passwordResetRepository } from "@/lib/repositories/password-reset-repository";
import { sessionRepository } from "@/lib/repositories/session-repository";
import { auditLogRepository } from "@/lib/repositories/audit-log-repository";
import { serverSettingsRepository } from "@/lib/repositories/server-settings-repository";
import {
  checkRateLimit,
  getClientIpKey,
  isBodyTooLarge,
} from "@/lib/api/rate-limit";
import { parseJsonBody, tooManyRequests } from "@/lib/api/api-guards";
import { MAX_BODY_BYTES, RATE_LIMIT_BACKOFF } from "@/lib/config";

const requestSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(1),
});

export async function POST(request: Request): Promise<NextResponse> {
  const t = await getTranslations("Api");

  if (isBodyTooLarge(request, MAX_BODY_BYTES.resetPassword)) {
    return NextResponse.json({ error: t("invalidRequest") }, { status: 413 });
  }

  const { allowed, retryAfterSeconds } = await checkRateLimit(
    `reset-password:${getClientIpKey(request)}`,
    RATE_LIMIT_BACKOFF.resetPassword,
  );
  if (!allowed) {
    return tooManyRequests(retryAfterSeconds, t("tooManyRequests"));
  }

  const parsedBody = await parseJsonBody(
    request,
    requestSchema,
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

  const userId = await passwordResetRepository.consume(parsed.data.token);
  if (!userId) {
    return NextResponse.json(
      { error: t("passwordResetInvalid") },
      { status: 400 },
    );
  }

  const user = await userRepository.findById(userId);
  if (!user) {
    return NextResponse.json(
      { error: t("passwordResetInvalid") },
      { status: 400 },
    );
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await userRepository.updatePassword(userId, passwordHash);
  await sessionRepository.revokeAllForUser(userId);
  await auditLogRepository.record({
    actorId: user.id,
    actorUsername: user.username,
    action: "PASSWORD_RESET_COMPLETED",
    targetId: user.id,
  });

  return NextResponse.json({ ok: true });
}
