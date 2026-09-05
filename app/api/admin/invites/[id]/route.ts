import { NextResponse } from "next/server";
import { inviteRepository } from "@/lib/repositories/invite-repository";
import { auditLogRepository } from "@/lib/repositories/audit-log-repository";
import { requireScope } from "@/lib/api/api-guards";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const user = await requireScope("MANAGE_INVITES");
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  const invite = await inviteRepository.revoke(id);
  await auditLogRepository.record({
    actorId: user.id,
    actorUsername: user.username,
    action: "INVITE_REVOKED",
    targetId: invite.id,
    metadata: { code: invite.code },
  });
  return NextResponse.json({ ok: true });
}
