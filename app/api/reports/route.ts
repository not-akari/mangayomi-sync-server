import { NextResponse } from "next/server";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { getSessionUser } from "@/lib/auth/auth";
import { reportRepository } from "@/lib/repositories/report-repository";
import { userRepository } from "@/lib/repositories/user-repository";
import { auditLogRepository } from "@/lib/repositories/audit-log-repository";
import {
  checkRateLimit,
  getClientIpKey,
  isBodyTooLarge,
} from "@/lib/api/rate-limit";
import { requireUser, parseJsonBody, tooManyRequests } from "@/lib/api/api-guards";
import { MAX_BODY_BYTES, RATE_LIMIT_BACKOFF } from "@/lib/config";

const baseFields = {
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(5000),
};
const authedSchema = z.object(baseFields);
// Submitted while logged out with no session to attach - who they are is just whatever they typed plus contact info.
const publicSchema = z.object({
  ...baseFields,
  contactUsername: z.string().trim().min(1).max(100),
  contactInfo: z.string().trim().max(300).optional(),
});

export async function GET(): Promise<NextResponse> {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  const reports = await reportRepository.listForUser(user.id);
  return NextResponse.json({ reports });
}

export async function POST(request: Request): Promise<NextResponse> {
  const t = await getTranslations("Api");

  if (isBodyTooLarge(request, MAX_BODY_BYTES.reports)) {
    return NextResponse.json({ error: t("invalidRequest") }, { status: 413 });
  }

  const user = await getSessionUser();

  if (user) {
    const { allowed, retryAfterSeconds } = await checkRateLimit(
      `report-create:${user.id}`,
      RATE_LIMIT_BACKOFF.reportCreate,
    );
    if (!allowed) {
      return tooManyRequests(retryAfterSeconds, t("tooManyRequests"));
    }

    const parsedBody = await parseJsonBody(
      request,
      authedSchema,
      t("invalidRequest"),
    );
    if (parsedBody instanceof NextResponse) return parsedBody;
    const parsed = parsedBody;

    const report = await reportRepository.create({
      userId: user.id,
      subject: parsed.data.subject,
      message: parsed.data.message,
    });
    await auditLogRepository.record({
      actorId: user.id,
      actorUsername: user.username,
      action: "REPORT_CREATED",
      targetId: report.id,
      metadata: { subject: report.subject },
    });
    return NextResponse.json({ report }, { status: 201 });
  }

  const { allowed, retryAfterSeconds } = await checkRateLimit(
    `report-create-public:${getClientIpKey(request)}`,
    RATE_LIMIT_BACKOFF.reportCreatePublic,
  );
  if (!allowed) {
    return tooManyRequests(retryAfterSeconds, t("tooManyRequests"));
  }

  const parsedBody = await parseJsonBody(
    request,
    publicSchema,
    t("invalidRequest"),
  );
  if (parsedBody instanceof NextResponse) return parsedBody;
  const parsed = parsedBody;

  // Best-effort link to a real account for the admin's convenience, never trusted for anything sensitive.
  const matchedUser = await userRepository.findByUsername(
    parsed.data.contactUsername,
  );

  const report = await reportRepository.create({
    userId: matchedUser?.id,
    contactUsername: parsed.data.contactUsername,
    contactInfo: parsed.data.contactInfo,
    subject: parsed.data.subject,
    message: parsed.data.message,
  });
  await auditLogRepository.record({
    actorId: matchedUser?.id,
    actorUsername: parsed.data.contactUsername,
    action: "REPORT_CREATED",
    targetId: report.id,
    metadata: { subject: report.subject, loggedOut: true },
  });
  return NextResponse.json({ report }, { status: 201 });
}
