import { NextResponse } from "next/server";
import { reportRepository } from "@/lib/repositories/report-repository";
import { requireScope } from "@/lib/api/api-guards";

export async function GET(): Promise<NextResponse> {
  const user = await requireScope("MANAGE_REPORTS");
  if (user instanceof NextResponse) return user;
  const reports = await reportRepository.listAll();
  return NextResponse.json({ reports });
}
