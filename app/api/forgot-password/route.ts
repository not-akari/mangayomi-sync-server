import { NextResponse } from "next/server";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { userRepository } from "@/lib/repositories/user-repository";
import { passwordResetRepository } from "@/lib/repositories/password-reset-repository";
import { serverSettingsRepository } from "@/lib/repositories/server-settings-repository";
import { auditLogRepository } from "@/lib/repositories/audit-log-repository";
import { isEmailConfigured, sendPasswordResetEmail } from "@/lib/services/mail";
import {
  checkRateLimit,
  getClientIpKey,
  isBodyTooLarge,
} from "@/lib/api/rate-limit";
import { parseJsonBody, tooManyRequests } from "@/lib/api/api-guards";
import { getRequestOrigin } from "@/lib/api/request-origin";
import { MAX_BODY_BYTES, RATE_LIMIT_BACKOFF } from "@/lib/config";

const requestSchema = z.object({ username: z.string().trim().min(1).max(100) });

export async function POST(request: Request): Promise<NextResponse> {
  const t = await getTranslations("Api");

  if (isBodyTooLarge(request, MAX_BODY_BYTES.forgotPassword)) {
    return NextResponse.json({ error: t("invalidRequest") }, { status: 413 });
  }

  const { allowed, retryAfterSeconds } = await checkRateLimit(
    `forgot-password:${getClientIpKey(request)}`,
    RATE_LIMIT_BACKOFF.forgotPassword,
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

  // Always the same response regardless of account/email/SMTP state, so nothing lets someone enumerate usernames.
  const settings = await serverSettingsRepository.get();
  if (isEmailConfigured(settings)) {
    const user = await userRepository.findByUsername(parsed.data.username);
    if (user?.email) {
      const token = await passwordResetRepository.create(user.id);
      // request.url's origin can be an internal address behind a proxy/tunnel; publicAppUrl overrides it when set.
      const appOrigin = getRequestOrigin(request, settings.publicAppUrl);
      const resetUrl = `${appOrigin}/reset-password?token=${token}`;
      try {
        await sendPasswordResetEmail(settings, user.email, resetUrl);
        console.log(
          `Password reset email sent to ${user.email} (user: ${user.username})`,
        );
        await auditLogRepository.record({
          actorId: user.id,
          actorUsername: user.username,
          action: "PASSWORD_RESET_REQUESTED",
          targetId: user.id,
        });
      } catch (error) {
        console.error("Failed to send password reset email:", error);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
