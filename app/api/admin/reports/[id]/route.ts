import { NextResponse } from "next/server";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { reportRepository } from "@/lib/repositories/report-repository";
import { auditLogRepository } from "@/lib/repositories/audit-log-repository";
import { requireScope } from "@/lib/api/api-guards";
import {
  REPORT_STATUS_VALUES,
  rejectReasonRequired,
  REJECT_REASON_REFINE_PARAMS,
  reportValidationErrorMessage,
} from "@/lib/validation/reports";

const updateSchema = z
  .object({
    status: z.enum(REPORT_STATUS_VALUES),
    adminNote: z.string().trim().max(2000).nullable().optional(),
  })
  .refine(rejectReasonRequired, REJECT_REASON_REFINE_PARAMS);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const t = await getTranslations("Api");
  const user = await requireScope("MANAGE_REPORTS");
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  const body: unknown = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: reportValidationErrorMessage(t, parsed.error.issues) },
      { status: 400 },
    );
  }

  const report = await reportRepository.setStatus(
    id,
    parsed.data.status,
    parsed.data.adminNote ?? null,
  );
  await auditLogRepository.record({
    actorId: user.id,
    actorUsername: user.username,
    action: "REPORT_STATUS_CHANGED",
    targetId: report.id,
    metadata: { subject: report.subject, status: report.status },
  });
  return NextResponse.json({ report });
}
