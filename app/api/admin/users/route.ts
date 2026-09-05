import { NextResponse } from "next/server";
import { userRepository } from "@/lib/repositories/user-repository";
import { serverSettingsRepository } from "@/lib/repositories/server-settings-repository";
import { requireScope } from "@/lib/api/api-guards";
import { parsePageParam, paginationMeta } from "@/lib/api/pagination";
import { PAGE_SIZE as PAGE_SIZES } from "@/lib/config";

const PAGE_SIZE = PAGE_SIZES.adminUsers;

export async function GET(request: Request): Promise<NextResponse> {
  const user = await requireScope("MANAGE_USERS");
  if (user instanceof NextResponse) return user;

  const url = new URL(request.url);
  const page = parsePageParam(url);
  const search = url.searchParams.get("search")?.trim() ?? "";

  const [{ users, total }, { avatarsEnabled }] = await Promise.all([
    userRepository.listPage({ page, pageSize: PAGE_SIZE, search }),
    serverSettingsRepository.get(),
  ]);
  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      username: u.username,
      role: u.role,
      scopes: u.scopes,
      suspended: u.suspended,
      isPrimaryAdmin: u.isPrimaryAdmin,
      createdAt: u.createdAt,
      avatarUrl: avatarsEnabled ? u.avatarUrl : null,
    })),
    ...paginationMeta(total, page, PAGE_SIZE),
  });
}
