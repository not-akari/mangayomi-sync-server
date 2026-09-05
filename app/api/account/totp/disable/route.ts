import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { verifyPassword } from "@/lib/auth/password";
import { userRepository } from "@/lib/repositories/user-repository";
import { auditLogRepository } from "@/lib/repositories/audit-log-repository";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { totpDisableSchema } from "@/lib/validation/totp";
import { requireUser, parseJsonBody, tooManyRequests } from "@/lib/api/api-guards";
import { RATE_LIMIT_BACKOFF } from "@/lib/config";

// Requires the current password, same as changing it.
export async function POST(request: Request): Promise<NextResponse> {
  const t = await getTranslations("Api");
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const { allowed, retryAfterSeconds } = await checkRateLimit(
    `totp-disable:${user.id}`,
    RATE_LIMIT_BACKOFF.accountPassword,
  );
  if (!allowed) {
    return tooManyRequests(retryAfterSeconds, t("tooManyRequests"));
  }

  const parsedBody = await parseJsonBody(
    request,
    totpDisableSchema,
    t("invalidRequest"),
  );
  if (parsedBody instanceof NextResponse) return parsedBody;

  const passwordValid = await verifyPassword(
    user.passwordHash,
    parsedBody.data.password,
  );
  if (!passwordValid) {
    return NextResponse.json(
      { error: t("currentPasswordIncorrect") },
      { status: 401 },
    );
  }

  await userRepository.disableTotp(user.id);
  await auditLogRepository.record({
    actorId: user.id,
    actorUsername: user.username,
    action: "TOTP_DISABLED",
    targetId: user.id,
  });

  return NextResponse.json({ ok: true });
}
