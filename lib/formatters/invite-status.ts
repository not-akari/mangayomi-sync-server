export interface InviteStatusFields {
  revoked: boolean;
  expiresAt: Date | string | null;
  maxUses: number | null;
  useCount: number;
}

export function isInviteActive(invite: InviteStatusFields): boolean {
  if (invite.revoked) return false;
  if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
    return false;
  }
  if (invite.maxUses !== null && invite.useCount >= invite.maxUses) {
    return false;
  }
  return true;
}

export interface InviteSearchFields {
  code: string;
  label: string | null;
}

export function inviteMatchesSearch(
  invite: InviteSearchFields,
  query: string,
): boolean {
  if (!query) return true;
  const haystack = `${invite.code} ${invite.label ?? ""}`.toLowerCase();
  return haystack.includes(query.toLowerCase());
}
