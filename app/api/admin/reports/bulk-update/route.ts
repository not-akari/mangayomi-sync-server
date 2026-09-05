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
import { MAX_BULK_IDS } from "@/lib/config";

const updateSchema = z
  .object({
    ids: z.array(z.string()).min(1).max(MAX_BULK_IDS.reports),
    status: z.enum(REPORT_STATUS_VALUES),
    adminNote: z.string().trim().max(2000).nullable().optional(),
  })
  .refine(rejectReasonRequired, REJECT_REASON_REFINE_PARAMS);

export async function POST(request: Request): Promise<NextResponse> {
  const t = await getTranslations("Api");
  const user = await requireScope("MANAGE_REPORTS");
  if (user instanceof NextResponse) return user;

  const body: unknown = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: reportValidationErrorMessage(t, parsed.error.issues) },
      { status: 400 },
    );
  }

  const count = await reportRepository.setStatusMany(
    parsed.data.ids,
    parsed.data.status,
    parsed.data.adminNote ?? null,
  );

  if (count > 0) {
    await auditLogRepository.record({
      actorId: user.id,
      actorUsername: user.username,
      action: "REPORT_STATUS_CHANGED",
      metadata: { bulk: true, count, status: parsed.data.status },
    });
  }

  return NextResponse.json({ updated: count });
}
