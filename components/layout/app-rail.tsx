"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import type { AdminScope } from "@prisma/client";
import { NavItem } from "./nav-item";
import { UserMenu } from "./user-menu";
import {
  ADMIN_ENTRY,
  APP_DESTINATIONS,
  activeHref,
  visibleAdminDestinations,
} from "./nav-destinations";

// Desktop rail navigation matching the client app navigation rail.
export function AppRail({
  user,
  scopes,
  avatarsEnabled,
}: {
  user: { username: string; avatarUrl: string | null; role: string };
  scopes: AdminScope[];
  avatarsEnabled: boolean;
}): React.ReactElement {
  const pathname = usePathname();
  const t = useTranslations("SiteHeader");
  const tAdmin = useTranslations("Admin");
  const inAdmin = pathname.startsWith("/admin");

  const destinations = inAdmin
    ? visibleAdminDestinations(scopes)
    : APP_DESTINATIONS;
  const active = activeHref(pathname, destinations);

  return (
    <aside className="hidden w-20 shrink-0 border-r lg:block">
      <div className="sticky top-0 flex max-h-svh flex-col overflow-y-auto px-2 py-3">
        <Link
          href="/library"
          className="mb-2 flex justify-center rounded-lg py-2"
          aria-label="Mangayomi"
        >
          <Image
            src="/icon.png"
            alt=""
            width={28}
            height={28}
            className="rounded-md"
          />
        </Link>

        <nav className="flex flex-col gap-1">
          {inAdmin && (
            <NavItem
              href="/library"
              label={t("backToApp")}
              icon={ArrowLeft}
              variant="rail"
            />
          )}
          {destinations.map((destination) => (
            <NavItem
              key={destination.href}
              href={destination.href}
              label={inAdmin ? tAdmin(destination.key) : t(destination.key)}
              icon={destination.icon}
              active={active === destination.href}
              variant="rail"
            />
          ))}
          {!inAdmin && user.role === "ADMIN" && (
            <NavItem
              href={ADMIN_ENTRY.href}
              label={t(ADMIN_ENTRY.key)}
              icon={ADMIN_ENTRY.icon}
              variant="rail"
            />
          )}
        </nav>

        <div className="mt-auto flex justify-center border-t pt-3">
          <UserMenu
            username={user.username}
            avatarUrl={avatarsEnabled ? user.avatarUrl : null}
            showName={false}
          />
        </div>
      </div>
    </aside>
  );
}
