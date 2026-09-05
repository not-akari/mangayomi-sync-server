import type { AdminScope } from "@prisma/client";

export interface Invite {
  id: string;
  code: string;
  label: string | null;
  maxUses: number | null;
  useCount: number;
  revoked: boolean;
  expiresAt: string | null;
  createdAt: string;
  grantedRole: "USER" | "ADMIN";
  grantedScopes: AdminScope[];
  maxLibraryBytesOverride: number | null;
  _count: { redemptions: number };
}

export interface InvitePreset {
  id: string;
  name: string;
  maxUses: number | null;
  expiresInDays: number | null;
  grantedScopes: AdminScope[];
  maxLibraryBytesOverride: number | null;
}

export const EXPIRY_PRESETS: { key: string; days: number | null }[] = [
  { key: "24h", days: 1 },
  { key: "7d", days: 7 },
  { key: "30d", days: 30 },
  { key: "never", days: null },
];
