import { NextResponse } from "next/server";
import { revokeSessionById } from "@/lib/auth/session";
import { auditLogRepository } from "@/lib/repositories/audit-log-repository";
import { requireUser } from "@/lib/api/api-guards";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  const { id } = await params;
  await revokeSessionById(id, user.id);
  await auditLogRepository.record({
    actorId: user.id,
    actorUsername: user.username,
    action: "SESSION_REVOKED",
    targetId: user.id,
  });
  return NextResponse.json({ ok: true });
}
