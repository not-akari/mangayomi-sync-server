import { NextResponse } from "next/server";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { reportRepository } from "@/lib/repositories/report-repository";
import { auditLogRepository } from "@/lib/repositories/audit-log-repository";
import { requireUser, parseJsonBody, tooManyRequests } from "@/lib/api/api-guards";
import { checkRateLimit, isBodyTooLarge } from "@/lib/api/rate-limit";
import { MAX_BODY_BYTES, RATE_LIMIT_BACKOFF } from "@/lib/config";

const messageSchema = z.object({
  message: z.string().trim().min(1).max(5000),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const t = await getTranslations("Api");
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const { id } = await params;

  const { allowed, retryAfterSeconds } = await checkRateLimit(
    `report-reply:${user.id}`,
    RATE_LIMIT_BACKOFF.reportReply,
  );
  if (!allowed) {
    return tooManyRequests(retryAfterSeconds, t("tooManyRequests"));
  }

  if (isBodyTooLarge(request, MAX_BODY_BYTES.reports)) {
    return NextResponse.json({ error: t("requestTooLarge") }, { status: 413 });
  }

  const parsedBody = await parseJsonBody(
    request,
    messageSchema,
    t("invalidRequest"),
  );
  if (parsedBody instanceof NextResponse) return parsedBody;

  const report = await reportRepository.findById(id);
  if (!report) {
    return NextResponse.json({ error: t("notFound") }, { status: 404 });
  }

  const isOwner = report.userId === user.id;
  const isAdmin =
    user.role === "ADMIN" || user.scopes.includes("MANAGE_REPORTS");

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: t("notFound") }, { status: 404 });
  }

  const createdMessage = await reportRepository.addMessage({
    reportId: id,
    senderId: user.id,
    isAdmin,
    message: parsedBody.data.message,
  });

  await auditLogRepository.record({
    actorId: user.id,
    actorUsername: user.username,
    action: "REPORT_REPLY_CREATED",
    targetId: report.id,
    metadata: { subject: report.subject, isAdmin },
  });

  return NextResponse.json({ message: createdMessage }, { status: 201 });
}
