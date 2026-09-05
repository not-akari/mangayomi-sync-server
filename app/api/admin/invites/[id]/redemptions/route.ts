import { NextResponse } from "next/server";
import { inviteRepository } from "@/lib/repositories/invite-repository";
import { requireScope } from "@/lib/api/api-guards";
import { parsePageParam, paginationMeta } from "@/lib/api/pagination";
import { PAGE_SIZE as PAGE_SIZES } from "@/lib/config";

const PAGE_SIZE = PAGE_SIZES.adminInviteRedemptions;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const user = await requireScope("MANAGE_INVITES");
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim() ?? "";
  const page = parsePageParam(url);

  const { redemptions, total } = await inviteRepository.redemptionsPage(id, {
    search,
    page,
    pageSize: PAGE_SIZE,
  });

  return NextResponse.json({
    redemptions,
    ...paginationMeta(total, page, PAGE_SIZE),
  });
}
