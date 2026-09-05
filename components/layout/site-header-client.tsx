"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { UserMenu } from "@/components/layout/user-menu";

const AUTH_ROUTES = ["/login", "/setup", "/forgot-password", "/reset-password"];

// Header for logged-out pages; signed-in pages use AppShell navigation.
export function SiteHeaderClient({
  user,
  siteName,
  avatarsEnabled,
}: {
  user: { username: string; avatarUrl: string | null; role: string } | null;
  siteName: string | null;
  avatarsEnabled: boolean;
}): React.ReactElement {
  const t = useTranslations("SiteHeader");
  const pathname = usePathname();
  // Offering "Log in" on the login page itself is a dead link, so it is dropped on the auth routes.
  const onAuthRoute = AUTH_ROUTES.includes(pathname);

  return (
    <header className="flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
      <Link
        href="/"
        className="flex shrink-0 items-center gap-2 text-lg font-semibold"
      >
        <Image
          src="/icon.png"
          alt=""
          width={24}
          height={24}
          className="rounded-sm"
        />
        <span className="hidden sm:inline">{siteName || "Mangayomi"}</span>
      </Link>
      {user ? (
        <UserMenu
          username={user.username}
          avatarUrl={avatarsEnabled ? user.avatarUrl : null}
        />
      ) : (
        !onAuthRoute && (
          <Link href="/login" className="shrink-0 text-sm hover:underline">
            {t("loginRegister")}
          </Link>
        )
      )}
    </header>
  );
}
