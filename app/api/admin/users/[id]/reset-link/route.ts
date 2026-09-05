import { NextResponse } from "next/server";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { userRepository } from "@/lib/repositories/user-repository";
import { passwordResetRepository } from "@/lib/repositories/password-reset-repository";
import { serverSettingsRepository } from "@/lib/repositories/server-settings-repository";
import { isEmailConfigured, sendPasswordResetEmail } from "@/lib/services/mail";
import { auditLogRepository } from "@/lib/repositories/audit-log-repository";
import { requireScope } from "@/lib/api/api-guards";
import { getRequestOrigin } from "@/lib/api/request-origin";

const requestSchema = z.object({ sendEmail: z.boolean().optional() });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const t = await getTranslations("Api");
  const user = await requireScope("MANAGE_USERS");
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  const target = await userRepository.findById(id);
  if (!target) {
    return NextResponse.json({ error: t("notFound") }, { status: 404 });
  }
  // Minting a reset link is an account takeover path, so it gets the same primary-admin protection as role changes.
  if (target.isPrimaryAdmin && target.id !== user.id) {
    return NextResponse.json(
      { error: t("cannotModifyPrimaryAdmin") },
      { status: 403 },
    );
  }

  const body: unknown = await request.json().catch(() => ({}));
  const parsed = requestSchema.safeParse(body);
  const wantsEmail = parsed.success && parsed.data.sendEmail === true;

  // Fetched unconditionally since publicAppUrl is also needed to build resetUrl below, not just for email config.
  const settings = await serverSettingsRepository.get();
  const token = await passwordResetRepository.create(target.id);
  const appOrigin = getRequestOrigin(request, settings.publicAppUrl);
  const resetUrl = `${appOrigin}/reset-password?token=${token}`;

  let emailed = false;
  if (wantsEmail && target.email) {
    if (isEmailConfigured(settings)) {
      try {
        await sendPasswordResetEmail(settings, target.email, resetUrl);
        emailed = true;
      } catch (error) {
        console.error("Failed to email admin-generated reset link:", error);
      }
    }
  }

  await auditLogRepository.record({
    actorId: user.id,
    actorUsername: user.username,
    action: "PASSWORD_RESET_LINK_CREATED",
    targetId: target.id,
    metadata: { targetUsername: target.username, emailed },
  });

  return NextResponse.json({ resetUrl, emailed });
}
