import {
  Bell,
  BookOpen,
  ChartNoAxesColumn,
  Clock,
  Flag,
  LayoutDashboard,
  Library,
  Radar,
  ScrollText,
  Settings,
  Shield,
  Ticket,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AdminScope } from "@prisma/client";

export interface Destination {
  href: string;
  /** Translation key, read from the namespace the caller passes. */
  key: string;
  icon: LucideIcon;
  /** Admin destinations only: the scope needed to see it. */
  scope?: AdminScope;
}

// App navigation destinations.
export const APP_DESTINATIONS: Destination[] = [
  { href: "/library", key: "nav.library", icon: BookOpen },
  { href: "/overview", key: "nav.overview", icon: ChartNoAxesColumn },
  { href: "/history", key: "nav.history", icon: Clock },
  { href: "/updates", key: "nav.updates", icon: Bell },
  { href: "/tracking", key: "nav.tracking", icon: Radar },
  { href: "/settings", key: "nav.settings", icon: Settings },
];

// Admin navigation destinations.
export const ADMIN_DESTINATIONS: Destination[] = [
  { href: "/admin", key: "tabs.overview", icon: LayoutDashboard },
  {
    href: "/admin/library",
    key: "tabs.library",
    icon: Library,
    scope: "MANAGE_SETTINGS",
  },
  {
    href: "/admin/users",
    key: "tabs.users",
    icon: Users,
    scope: "MANAGE_USERS",
  },
  {
    href: "/admin/invites",
    key: "tabs.invites",
    icon: Ticket,
    scope: "MANAGE_INVITES",
  },
  {
    href: "/admin/reports",
    key: "tabs.reports",
    icon: Flag,
    scope: "MANAGE_REPORTS",
  },
  {
    href: "/admin/logs",
    key: "tabs.logs",
    icon: ScrollText,
    scope: "VIEW_LOGS",
  },
  {
    href: "/admin/settings",
    key: "tabs.settings",
    icon: Settings,
    scope: "MANAGE_SETTINGS",
  },
];

export const ADMIN_ENTRY: Destination = {
  href: "/admin",
  key: "admin",
  icon: Shield,
};

export function visibleAdminDestinations(scopes: AdminScope[]): Destination[] {
  return ADMIN_DESTINATIONS.filter(
    (destination) =>
      destination.scope === undefined || scopes.includes(destination.scope),
  );
}

// Deepest matching destination href for active navigation highlighting.
export function activeHref(
  pathname: string,
  destinations: Destination[],
): string | null {
  const matches = destinations
    .filter(
      (destination) =>
        pathname === destination.href ||
        pathname.startsWith(`${destination.href}/`),
    )
    .map((destination) => destination.href);
  if (matches.length === 0) return null;
  return matches.reduce((a, b) => (b.length > a.length ? b : a));
}
