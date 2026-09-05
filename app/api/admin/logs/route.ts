import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { auditLogRepository } from "@/lib/repositories/audit-log-repository";
import { describeAuditLog } from "@/lib/formatters/audit-log-describe";
import type { AuditAction } from "@prisma/client";
import { requireScope } from "@/lib/api/api-guards";
import { parsePageParam, paginationMeta } from "@/lib/api/pagination";
import { PAGE_SIZE as PAGE_SIZES } from "@/lib/config";

const PAGE_SIZE = PAGE_SIZES.adminLogs;
const AUDIT_ACTION_VALUES = new Set<AuditAction>([
  "USER_REGISTERED",
  "USER_LOGIN",
  "INVITE_CREATED",
  "INVITE_REVOKED",
  "ROLE_CHANGED",
  "SETTINGS_CHANGED",
  "PASSWORD_CHANGED",
  "ACCOUNT_DELETED",
  "ACCOUNT_SUSPENDED",
  "ACCOUNT_REINSTATED",
  "PASSWORD_RESET_LINK_CREATED",
  "PASSWORD_RESET_REQUESTED",
  "PASSWORD_RESET_COMPLETED",
  "EMAIL_CHANGED",
  "AVATAR_CHANGED",
  "REPORT_CREATED",
  "REPORT_STATUS_CHANGED",
  "REPORT_REPLY_CREATED",
  "SESSION_REVOKED",
  "CATALOG_NSFW_OVERRIDE_SET",
  "CATALOG_NSFW_BULK_OVERRIDE_SET",
  "TOTP_ENABLED",
  "TOTP_DISABLED",
  "TOTP_RECOVERY_CODE_USED",
]);

export async function GET(request: Request): Promise<NextResponse> {
  const user = await requireScope("VIEW_LOGS");
  if (user instanceof NextResponse) return user;

  const url = new URL(request.url);
  const page = parsePageParam(url);
  const search = url.searchParams.get("search")?.trim() ?? "";
  const actionParam = url.searchParams.get("action");
  const action =
    actionParam && AUDIT_ACTION_VALUES.has(actionParam as AuditAction)
      ? (actionParam as AuditAction)
      : undefined;

  const [{ entries, total }, t] = await Promise.all([
    auditLogRepository.listPage({ page, pageSize: PAGE_SIZE, action, search }),
    getTranslations("Admin"),
  ]);

  return NextResponse.json({
    entries: entries.map((entry) => ({
      id: entry.id,
      action: entry.action,
      description: describeAuditLog(entry, t),
      createdAt: entry.createdAt,
    })),
    ...paginationMeta(total, page, PAGE_SIZE),
    actions: Array.from(AUDIT_ACTION_VALUES),
  });
}
