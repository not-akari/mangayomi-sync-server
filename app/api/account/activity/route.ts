import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { auditLogRepository } from "@/lib/repositories/audit-log-repository";
import { describeAuditLog } from "@/lib/formatters/audit-log-describe";
import { requireUser } from "@/lib/api/api-guards";
import { parsePageParam, paginationMeta } from "@/lib/api/pagination";
import { PAGE_SIZE as PAGE_SIZES } from "@/lib/config";

const PAGE_SIZE = PAGE_SIZES.accountActivity;

export async function GET(request: Request): Promise<NextResponse> {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const url = new URL(request.url);
  const page = parsePageParam(url);

  const [{ entries, total }, t] = await Promise.all([
    auditLogRepository.listForUser(user.id, { page, pageSize: PAGE_SIZE }),
    getTranslations("Admin"),
  ]);

  return NextResponse.json({
    entries: entries.map((entry) => ({
      id: entry.id,
      description: describeAuditLog(entry, t),
      createdAt: entry.createdAt,
    })),
    ...paginationMeta(total, page, PAGE_SIZE),
  });
}
