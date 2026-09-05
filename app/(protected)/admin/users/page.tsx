"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CollapsibleTrigger } from "@/components/layout/collapsible-row";
import { UserAvatar } from "@/components/layout/user-avatar";
import { PaginationFooter } from "@/components/layout/pagination-footer";
import { ListState } from "@/components/layout/list-state";
import { cn } from "@/lib/utils";
import { UserDetailPanel } from "./user-detail-panel";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { SEARCH_DEBOUNCE_MS } from "@/lib/config";
import { useAdminUser } from "../admin-user-context";
import { PageShell, PageHeader } from "@/components/layout/page-shell";
import { ListRows } from "@/components/layout/page-section";

interface AdminUser {
  id: string;
  username: string;
  role: "USER" | "ADMIN";
  suspended: boolean;
  isPrimaryAdmin: boolean;
  createdAt: string;
  avatarUrl: string | null;
}

export default function AdminUsersPage(): React.ReactElement {
  const {
    userId: currentUserId,
    scopes: ownScopes,
    emailConfigured,
  } = useAdminUser();
  const t = useTranslations("Admin");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);
  const [page, setPage] = useState(1);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [result, setResult] = useState<{
    users: AdminUser[];
    total: number;
    totalPages: number;
  } | null>(null);
  const [error, setError] = useState(false);

  const fetchUsers = useCallback(async (): Promise<{
    users: AdminUser[];
    total: number;
    totalPages: number;
  }> => {
    const params = new URLSearchParams({ page: String(page) });
    if (debouncedSearch) params.set("search", debouncedSearch);
    const response = await fetch(`/api/admin/users?${params}`);
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return response.json();
  }, [page, debouncedSearch]);

  useEffect(() => {
    let cancelled = false;
    fetchUsers()
      .then((data) => {
        if (!cancelled) setResult(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchUsers]);

  return (
    <PageShell width="wide" className="gap-4">
      <PageHeader title={t("tabs.users")} />

      <Input
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
        }}
        placeholder={t("userSearchPlaceholder")}
      />

      <ListState
        error={error}
        loading={result === null}
        empty={result?.users.length === 0}
        errorLabel={t("actionFailedFallback")}
        loadingLabel={t("loading")}
        emptyLabel={t("noResults")}
        skeleton={"rows"}
        skeletonCount={8}
      />

      {result !== null && result.users.length > 0 && (
        <ListRows>
          {result.users.map((u) => {
            const expanded = expandedUserId === u.id;
            return (
              <div key={u.id}>
                <CollapsibleTrigger
                  open={expanded}
                  onToggle={() => setExpandedUserId(expanded ? null : u.id)}
                  className={cn("px-4 py-3", expanded && "bg-accent/50")}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <UserAvatar
                      username={u.username}
                      avatarUrl={u.avatarUrl}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="font-medium break-all">{u.username}</p>
                        {u.isPrimaryAdmin && (
                          <Badge tone="primary">
                            {t("userDetail.primaryAdmin")}
                          </Badge>
                        )}
                        {u.suspended && (
                          <Badge tone="destructive">
                            {t("userDetail.suspendedBadge")}
                          </Badge>
                        )}
                        {u.id === currentUserId && <Badge>{t("you")}</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {u.role === "ADMIN" ? t("roleAdmin") : t("roleUser")}
                        {" · "}
                        {new Date(u.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CollapsibleTrigger>
                {expanded && (
                  <UserDetailPanel
                    userId={u.id}
                    isSelf={u.id === currentUserId}
                    ownScopes={ownScopes}
                    emailConfigured={emailConfigured}
                    onSaved={() => {
                      setExpandedUserId(null);
                      fetchUsers()
                        .then(setResult)
                        .catch(() => setError(true));
                    }}
                  />
                )}
              </div>
            );
          })}
        </ListRows>
      )}

      {result && (
        <PaginationFooter
          variant="ghost"
          page={page}
          totalPages={result.totalPages}
          onPrev={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
          label={t("userPage", { page, totalPages: result.totalPages })}
        />
      )}
    </PageShell>
  );
}
