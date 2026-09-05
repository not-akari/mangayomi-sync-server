import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { revokeSessionById } from "@/lib/auth/session";
import { userRepository } from "@/lib/repositories/user-repository";
import { auditLogRepository } from "@/lib/repositories/audit-log-repository";
import { requireScope } from "@/lib/api/api-guards";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; sessionId: string }> },
): Promise<NextResponse> {
  const t = await getTranslations("Api");
  const user = await requireScope("MANAGE_USERS");
  if (user instanceof NextResponse) return user;
  const { id, sessionId } = await params;

  const target = await userRepository.findById(id);
  if (!target) {
    return NextResponse.json({ error: t("notFound") }, { status: 404 });
  }
  // Same protection as changing their role or suspending them: other admins can't force the primary admin out.
  if (target.isPrimaryAdmin && target.id !== user.id) {
    return NextResponse.json(
      { error: t("cannotModifyPrimaryAdmin") },
      { status: 403 },
    );
  }

  await revokeSessionById(sessionId, id);
  await auditLogRepository.record({
    actorId: user.id,
    actorUsername: user.username,
    action: "SESSION_REVOKED",
    targetId: id,
    metadata: { targetUsername: target.username, byAdmin: true },
  });

  return NextResponse.json({ ok: true });
}
