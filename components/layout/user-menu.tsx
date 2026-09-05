"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LogOut, User as UserIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/layout/user-avatar";
import { apiFetch } from "@/lib/auth/csrf-client";

export function UserMenu({
  username,
  avatarUrl,
  showName = true,
}: {
  username: string;
  avatarUrl: string | null;
  /** Off in the rail, where there is only room for the avatar. */
  showName?: boolean;
}): React.ReactElement {
  const router = useRouter();
  const t = useTranslations("SiteHeader");

  async function handleLogout(): Promise<void> {
    await apiFetch("/api/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <UserAvatar username={username} avatarUrl={avatarUrl} size="sm" />
        {showName && <span className="hidden sm:inline">{username}</span>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem render={<Link href="/account" />}>
          <UserIcon />
          {t("account")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleLogout}>
          <LogOut />
          {t("logOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
