import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { inviteRepository } from "@/lib/repositories/invite-repository";
import { auditLogRepository } from "@/lib/repositories/audit-log-repository";
import { requireScope, parseJsonBody } from "@/lib/api/api-guards";
import { MAX_BULK_IDS } from "@/lib/config";

const requestSchema = z.object({
  ids: z.array(z.string()).min(1).max(MAX_BULK_IDS.invites),
});

export async function POST(request: Request): Promise<NextResponse> {
  const t = await getTranslations("Api");
  const user = await requireScope("MANAGE_INVITES");
  if (user instanceof NextResponse) return user;

  const parsedBody = await parseJsonBody(
    request,
    requestSchema,
    t("invalidRequest"),
  );
  if (parsedBody instanceof NextResponse) return parsedBody;
  const parsed = parsedBody;

  const revokedCodes = await inviteRepository.revokeMany(parsed.data.ids);
  if (revokedCodes.length > 0) {
    await auditLogRepository.record({
      actorId: user.id,
      actorUsername: user.username,
      action: "INVITE_REVOKED",
      metadata: { bulk: true, count: revokedCodes.length, codes: revokedCodes },
    });
  }

  return NextResponse.json({ revoked: revokedCodes.length });
}
