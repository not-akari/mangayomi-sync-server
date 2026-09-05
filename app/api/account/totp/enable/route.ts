import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { verifyTotpCode, generateRecoveryCodes } from "@/lib/auth/totp";
import { userRepository } from "@/lib/repositories/user-repository";
import { auditLogRepository } from "@/lib/repositories/audit-log-repository";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { totpEnableSchema } from "@/lib/validation/totp";
import { requireUser, parseJsonBody, tooManyRequests } from "@/lib/api/api-guards";
import { RATE_LIMIT_BACKOFF } from "@/lib/config";

export async function POST(request: Request): Promise<NextResponse> {
  const t = await getTranslations("Api");
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const { allowed, retryAfterSeconds } = await checkRateLimit(
    `totp-enable:${user.id}`,
    RATE_LIMIT_BACKOFF.totpVerify,
  );
  if (!allowed) {
    return tooManyRequests(retryAfterSeconds, t("tooManyRequests"));
  }

  const parsedBody = await parseJsonBody(
    request,
    totpEnableSchema,
    t("invalidRequest"),
  );
  if (parsedBody instanceof NextResponse) return parsedBody;
  const { secret, code } = parsedBody.data;

  if (!verifyTotpCode(secret, code)) {
    return NextResponse.json({ error: t("totp.invalidCode") }, { status: 400 });
  }

  const { codes, hashes } = generateRecoveryCodes();
  await userRepository.enableTotp(user.id, secret, hashes);
  await auditLogRepository.record({
    actorId: user.id,
    actorUsername: user.username,
    action: "TOTP_ENABLED",
    targetId: user.id,
  });

  return NextResponse.json({ recoveryCodes: codes });
}
