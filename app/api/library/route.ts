import { NextResponse } from "next/server";
import { libraryRepository } from "@/lib/repositories/library-repository";
import type { ItemType } from "@prisma/client";
import { requireUser } from "@/lib/api/api-guards";
import { parsePageParam, paginationMeta } from "@/lib/api/pagination";
import { PAGE_SIZE as PAGE_SIZES } from "@/lib/config";

const PAGE_SIZE = PAGE_SIZES.library;
const ITEM_TYPES: ItemType[] = ["MANGA", "ANIME", "NOVEL"];

export async function GET(request: Request): Promise<NextResponse> {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const url = new URL(request.url);
  const page = parsePageParam(url);
  const search = url.searchParams.get("search")?.trim() ?? "";
  const itemTypeParam = url.searchParams.get("itemType");
  const itemType = ITEM_TYPES.includes(itemTypeParam as ItemType)
    ? (itemTypeParam as ItemType)
    : null;

  const { entries, total } = await libraryRepository.listPage({
    userId: user.id,
    page,
    pageSize: PAGE_SIZE,
    search,
    itemType,
  });

  return NextResponse.json({
    entries,
    ...paginationMeta(total, page, PAGE_SIZE),
    blurNsfw: user.blurNsfw,
  });
}
