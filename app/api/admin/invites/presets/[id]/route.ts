import { NextResponse } from "next/server";
import { invitePresetRepository } from "@/lib/repositories/invite-preset-repository";
import { requireScope } from "@/lib/api/api-guards";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const user = await requireScope("MANAGE_INVITES");
  if (user instanceof NextResponse) return user;
  const { id } = await params;
  await invitePresetRepository.delete(id);
  return NextResponse.json({ ok: true });
}
