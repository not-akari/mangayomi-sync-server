import { NextResponse } from "next/server";
import { listSessions } from "@/lib/auth/session";
import { requireScope } from "@/lib/api/api-guards";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const user = await requireScope("MANAGE_USERS");
  if (user instanceof NextResponse) return user;
  const { id } = await params;
  const sessions = await listSessions(id);
  return NextResponse.json({ sessions });
}
