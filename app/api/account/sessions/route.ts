import { NextResponse } from "next/server";
import { listSessions } from "@/lib/auth/session";
import { requireUser } from "@/lib/api/api-guards";

export async function GET(): Promise<NextResponse> {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  const sessions = await listSessions(user.id);
  return NextResponse.json({ sessions });
}
