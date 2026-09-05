"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import type { AdminScope } from "@prisma/client";
import { NavItem } from "./nav-item";
import {
  ADMIN_ENTRY,
  APP_DESTINATIONS,
  activeHref,
  visibleAdminDestinations,
} from "./nav-destinations";

// Mobile navigation matching the client app bottom navigation bar.
export function AppBottomNav({
  scopes,
  isAdmin,
}: {
  scopes: AdminScope[];
  isAdmin: boolean;
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
    <nav className="sticky bottom-0 z-40 border-t bg-background lg:hidden">
      <div className="no-scrollbar flex items-stretch gap-1 overflow-x-auto px-2 py-1">
        {inAdmin && (
          <NavItem
            href="/library"
            label={t("backToApp")}
            icon={ArrowLeft}
            variant="bottom"
          />
        )}
        {destinations.map((destination) => (
          <NavItem
            key={destination.href}
            href={destination.href}
            label={inAdmin ? tAdmin(destination.key) : t(destination.key)}
            icon={destination.icon}
            active={active === destination.href}
            variant="bottom"
          />
        ))}
        {!inAdmin && isAdmin && (
          <NavItem
            href={ADMIN_ENTRY.href}
            label={t(ADMIN_ENTRY.key)}
            icon={ADMIN_ENTRY.icon}
            variant="bottom"
          />
        )}
      </div>
    </nav>
  );
}
