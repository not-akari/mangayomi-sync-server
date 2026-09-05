import { NextResponse } from "next/server";
import { adminCatalogRepository } from "@/lib/repositories/admin-catalog-repository";
import type { ItemType } from "@prisma/client";
import { requireScope } from "@/lib/api/api-guards";
import { parsePageParam, paginationMeta } from "@/lib/api/pagination";
import { PAGE_SIZE as PAGE_SIZES } from "@/lib/config";

const PAGE_SIZE = PAGE_SIZES.adminCatalogLibrary;
const ITEM_TYPES: ItemType[] = ["MANGA", "ANIME", "NOVEL"];

export async function GET(request: Request): Promise<NextResponse> {
  const user = await requireScope("MANAGE_SETTINGS");
  if (user instanceof NextResponse) return user;

  const url = new URL(request.url);
  const page = parsePageParam(url);
  const search = url.searchParams.get("search")?.trim() ?? "";
  const itemTypeParam = url.searchParams.get("itemType");
  const itemType = ITEM_TYPES.includes(itemTypeParam as ItemType)
    ? (itemTypeParam as ItemType)
    : null;
  const overriddenOnly = url.searchParams.get("overriddenOnly") === "true";

  const { entries, total } = await adminCatalogRepository.listPage({
    page,
    pageSize: PAGE_SIZE,
    search,
    itemType,
    overriddenOnly,
  });

  return NextResponse.json({
    entries,
    ...paginationMeta(total, page, PAGE_SIZE),
  });
}
