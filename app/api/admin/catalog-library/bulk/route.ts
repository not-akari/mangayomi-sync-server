import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { adminCatalogRepository } from "@/lib/repositories/admin-catalog-repository";
import { auditLogRepository } from "@/lib/repositories/audit-log-repository";
import { requireScope, parseJsonBody } from "@/lib/api/api-guards";
import { MAX_BULK_IDS } from "@/lib/config";

const bulkSchema = z.object({
  ids: z
    .array(z.number().int().positive())
    .min(1)
    .max(MAX_BULK_IDS.catalogLibrary),
  override: z.boolean().nullable(),
});

export async function PATCH(request: Request): Promise<NextResponse> {
  const t = await getTranslations("Api");
  const user = await requireScope("MANAGE_SETTINGS");
  if (user instanceof NextResponse) return user;

  const parsedBody = await parseJsonBody(
    request,
    bulkSchema,
    t("invalidRequest"),
  );
  if (parsedBody instanceof NextResponse) return parsedBody;
  const parsed = parsedBody;

  const { ids, override } = parsed.data;
  await adminCatalogRepository.setOverrideMany(ids, override);
  await auditLogRepository.record({
    actorId: user.id,
    actorUsername: user.username,
    action: "CATALOG_NSFW_BULK_OVERRIDE_SET",
    metadata: { count: ids.length, override },
  });

  return NextResponse.json({ ok: true });
}
