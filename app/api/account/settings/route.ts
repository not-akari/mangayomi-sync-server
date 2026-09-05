import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/api/api-guards";

// Read-only, for the /settings page's "here's what actually syncs" viewer - not part of the sync protocol itself.
export async function GET(): Promise<NextResponse> {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const settings = await db.settings.findUnique({ where: { userId: user.id } });
  if (!settings) {
    return NextResponse.json({ data: null, updatedAt: null });
  }

  return NextResponse.json({
    data: settings.data,
    updatedAt: Number(settings.updatedAt),
  });
}
