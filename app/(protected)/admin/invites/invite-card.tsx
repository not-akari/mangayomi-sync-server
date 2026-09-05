"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { isInviteActive } from "@/lib/formatters/invite-status";
import { BYTES_PER_MB } from "@/lib/config";
import { RedemptionsList } from "./redemptions-list";
import type { Invite } from "./types";

export function InviteCard({
  invite,
  onRevoke,
  selected,
  onToggleSelect,
}: {
  invite: Invite;
  onRevoke: (id: string) => void;
  selected: boolean;
  onToggleSelect: (id: string, checked: boolean) => void;
}): React.ReactElement {
  const t = useTranslations("AdminInvites");
  const isExpired = invite.expiresAt
    ? new Date(invite.expiresAt) < new Date()
    : false;
  const inactive = !isInviteActive(invite);

  // A row inside the group's ListRows, not a card of its own.
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          {!inactive && (
            <Checkbox
              checked={selected}
              onCheckedChange={(checked) =>
                onToggleSelect(invite.id, checked === true)
              }
              aria-label={t("selectInvite")}
            />
          )}
          <div className="min-w-0">
            <p className="font-mono font-medium break-all">{invite.code}</p>
            {invite.label && (
              <p className="text-sm text-muted-foreground italic">
                {invite.label}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              {invite.useCount}/{invite.maxUses ?? "∞"}
              {" · "}
              {new Date(invite.createdAt).toLocaleDateString()}
              {invite.grantedRole === "ADMIN" && ` · ${t("grantsAdmin")}`}
              {invite.maxLibraryBytesOverride !== null &&
                ` · ${t("quotaBadge", { count: Math.round(invite.maxLibraryBytesOverride / BYTES_PER_MB) })}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {inactive ? (
            <span className="text-sm text-muted-foreground">
              {invite.revoked
                ? t("statusRevoked")
                : isExpired
                  ? t("statusExpired")
                  : t("statusUsedUp")}
            </span>
          ) : (
            <Button variant="secondary" onClick={() => onRevoke(invite.id)}>
              {t("revoke")}
            </Button>
          )}
        </div>
      </div>
      {invite._count.redemptions > 0 && (
        <RedemptionsList
          inviteId={invite.id}
          count={invite._count.redemptions}
        />
      )}
    </div>
  );
}
