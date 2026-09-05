import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { adminCatalogRepository } from "@/lib/repositories/admin-catalog-repository";
import { auditLogRepository } from "@/lib/repositories/audit-log-repository";
import { db } from "@/lib/db";
import { requireScope, parseJsonBody } from "@/lib/api/api-guards";

const updateSchema = z.object({ override: z.boolean().nullable() });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const t = await getTranslations("Api");
  const user = await requireScope("MANAGE_SETTINGS");
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  const parsedId = Number(id);
  if (!Number.isSafeInteger(parsedId)) {
    return NextResponse.json({ error: t("invalidId") }, { status: 400 });
  }

  const parsedBody = await parseJsonBody(
    request,
    updateSchema,
    t("invalidRequest"),
  );
  if (parsedBody instanceof NextResponse) return parsedBody;
  const parsed = parsedBody;

  const entry = await db.catalogEntry.findUnique({
    where: { id: BigInt(parsedId) },
    select: { name: true },
  });
  if (!entry) {
    return NextResponse.json({ error: t("notFound") }, { status: 404 });
  }

  await adminCatalogRepository.setOverride(parsedId, parsed.data.override);
  await auditLogRepository.record({
    actorId: user.id,
    actorUsername: user.username,
    action: "CATALOG_NSFW_OVERRIDE_SET",
    targetId: String(parsedId),
    metadata: { title: entry.name, override: parsed.data.override },
  });

  return NextResponse.json({ ok: true });
}
