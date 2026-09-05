import { NextResponse } from "next/server";
import { trackingPageRepository } from "@/lib/repositories/tracking-repository";
import { requireUser } from "@/lib/api/api-guards";
import { parsePageParam, paginationMeta } from "@/lib/api/pagination";
import { PAGE_SIZE as PAGE_SIZES } from "@/lib/config";

const PAGE_SIZE = PAGE_SIZES.tracking;

export async function GET(request: Request): Promise<NextResponse> {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const url = new URL(request.url);
  const page = parsePageParam(url);
  const search = url.searchParams.get("search")?.trim() ?? "";

  const { entries, total } = await trackingPageRepository.listPage({
    userId: user.id,
    page,
    pageSize: PAGE_SIZE,
    search,
  });

  return NextResponse.json({
    entries,
    ...paginationMeta(total, page, PAGE_SIZE),
  });
}
