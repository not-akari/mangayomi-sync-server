import type { AdminScope, User } from "@prisma/client";

// The single source of truth for admin scopes - everything else derives from this list.
export const ADMIN_SCOPE_VALUES = [
  "MANAGE_INVITES",
  "MANAGE_USERS",
  "VIEW_LOGS",
  "MANAGE_SETTINGS",
  "MANAGE_REPORTS",
] as const;

export const ALL_ADMIN_SCOPES: AdminScope[] = [...ADMIN_SCOPE_VALUES];

export function hasScope(
  user: Pick<User, "role" | "scopes">,
  scope: AdminScope,
): boolean {
  return user.role === "ADMIN" && user.scopes.includes(scope);
}

// A scoped admin can't hand out more scopes than they hold, or an invite-manager could escalate to full admin via an invite/edit.
export function isScopeSubset(
  scopes: AdminScope[],
  grantorScopes: AdminScope[],
): boolean {
  return scopes.every((scope) => grantorScopes.includes(scope));
}
