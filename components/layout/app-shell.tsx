import Image from "next/image";
import Link from "next/link";
import type { AdminScope } from "@prisma/client";
import { AppRail } from "./app-rail";
import { AppBottomNav } from "./app-bottom-nav";
import { UserMenu } from "./user-menu";

// Navigation shell: desktop rail, mobile bottom navigation bar.
export function AppShell({
  user,
  scopes,
  siteName,
  avatarsEnabled,
  children,
}: {
  user: { username: string; avatarUrl: string | null; role: string };
  scopes: AdminScope[];
  siteName: string | null;
  avatarsEnabled: boolean;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="flex flex-1">
      <AppRail user={user} scopes={scopes} avatarsEnabled={avatarsEnabled} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b px-4 py-2.5 lg:hidden">
          <Link
            href="/library"
            className="flex shrink-0 items-center gap-2 text-sm font-semibold"
          >
            <Image
              src="/icon.png"
              alt=""
              width={22}
              height={22}
              className="rounded-sm"
            />
            <span className="truncate">{siteName || "Mangayomi"}</span>
          </Link>
          <UserMenu
            username={user.username}
            avatarUrl={avatarsEnabled ? user.avatarUrl : null}
          />
        </header>

        <div className="flex flex-1 flex-col">{children}</div>

        <AppBottomNav scopes={scopes} isAdmin={user.role === "ADMIN"} />
      </div>
    </div>
  );
}
