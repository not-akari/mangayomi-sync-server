import { NextResponse } from "next/server";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { reportRepository } from "@/lib/repositories/report-repository";
import { auditLogRepository } from "@/lib/repositories/audit-log-repository";
import { requireScope, parseJsonBody } from "@/lib/api/api-guards";
import { isBodyTooLarge } from "@/lib/api/rate-limit";
import { MAX_BODY_BYTES } from "@/lib/config";
import { REPORT_STATUS_VALUES } from "@/lib/validation/reports";

const adminMessageSchema = z.object({
  message: z.string().trim().min(1).max(5000),
  status: z.enum(REPORT_STATUS_VALUES).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const t = await getTranslations("Api");
  const user = await requireScope("MANAGE_REPORTS");
  if (user instanceof NextResponse) return user;

  const { id } = await params;

  if (isBodyTooLarge(request, MAX_BODY_BYTES.reports)) {
    return NextResponse.json({ error: t("requestTooLarge") }, { status: 413 });
  }

  const parsedBody = await parseJsonBody(
    request,
    adminMessageSchema,
    t("invalidRequest"),
  );
  if (parsedBody instanceof NextResponse) return parsedBody;

  const report = await reportRepository.findById(id);
  if (!report) {
    return NextResponse.json({ error: t("notFound") }, { status: 404 });
  }

  const createdMessage = await reportRepository.addMessage({
    reportId: id,
    senderId: user.id,
    isAdmin: true,
    message: parsedBody.data.message,
  });

  if (parsedBody.data.status && parsedBody.data.status !== report.status) {
    await reportRepository.setStatus(
      id,
      parsedBody.data.status,
      report.adminNote,
    );
    await auditLogRepository.record({
      actorId: user.id,
      actorUsername: user.username,
      action: "REPORT_STATUS_CHANGED",
      targetId: report.id,
      metadata: { subject: report.subject, status: parsedBody.data.status },
    });
  }

  await auditLogRepository.record({
    actorId: user.id,
    actorUsername: user.username,
    action: "REPORT_REPLY_CREATED",
    targetId: report.id,
    metadata: { subject: report.subject, isAdmin: true },
  });

  return NextResponse.json({ message: createdMessage }, { status: 201 });
}
