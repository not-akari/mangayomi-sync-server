import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { serverSettingsRepository } from "@/lib/repositories/server-settings-repository";
import { sendTestEmail } from "@/lib/services/mail";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { requireScope, parseJsonBody, tooManyRequests } from "@/lib/api/api-guards";
import { RATE_LIMIT_BACKOFF } from "@/lib/config";

const requestSchema = z.object({ to: z.string().trim().email() });

export async function POST(request: Request): Promise<NextResponse> {
  const t = await getTranslations("Api");
  const user = await requireScope("MANAGE_SETTINGS");
  if (user instanceof NextResponse) return user;

  const { allowed, retryAfterSeconds } = await checkRateLimit(
    `test-email:${user.id}`,
    RATE_LIMIT_BACKOFF.adminSettingsTestEmail,
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

  const settings = await serverSettingsRepository.get();
  try {
    await sendTestEmail(settings, parsed.data.to);
    console.log(
      `Test email sent to ${parsed.data.to} (requested by ${user.username})`,
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to send test email:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : t("testEmailFailed") },
      { status: 502 },
    );
  }
}
