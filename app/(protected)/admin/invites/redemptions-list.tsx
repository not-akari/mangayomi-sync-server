"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PaginationFooter } from "@/components/layout/pagination-footer";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { SEARCH_DEBOUNCE_MS, REDEMPTIONS_SEARCH_THRESHOLD } from "@/lib/config";

export function RedemptionsList({
  inviteId,
  count,
}: {
  inviteId: string;
  count: number;
}): React.ReactElement {
  const t = useTranslations("AdminInvites");
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");
  // Paged server-side, so it needs its own debounce instead of the outer invite-list search below.
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{
    redemptions: { username: string }[];
    total: number;
    totalPages: number;
  } | null>(null);

  useEffect(() => {
    if (!expanded) return;
    let cancelled = false;
    const params = new URLSearchParams({ page: String(page) });
    if (debouncedSearch) params.set("search", debouncedSearch);
    fetch(`/api/admin/invites/${inviteId}/redemptions?${params}`)
      .then((response) => {
        if (!response.ok) throw new Error(`Request failed: ${response.status}`);
        return response.json() as Promise<{
          redemptions: { username: string }[];
          total: number;
          totalPages: number;
        }>;
      })
      .then((data) => {
        if (!cancelled) setResult(data);
      })
      .catch(() => {
        if (!cancelled) {
          setResult({ redemptions: [], total: 0, totalPages: 1 });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [expanded, inviteId, page, debouncedSearch]);

  return (
    <div className="border-t">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground"
        onClick={() => setExpanded((e) => !e)}
      >
        <span>{t("redeemedBy", { count })}</span>
        <ChevronDown
          className={cn(
            "size-4 transition-transform",
            expanded && "rotate-180",
          )}
        />
      </button>
      {expanded && (
        <div className="flex flex-col gap-2 border-t bg-muted/30 px-4 py-3">
          {count > REDEMPTIONS_SEARCH_THRESHOLD && (
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder={t("redeemedBySearchPlaceholder")}
            />
          )}

          {!result ? (
            <div
              role="status"
              aria-busy="true"
              aria-label={t("loading")}
              className="flex flex-col gap-1"
            >
              {Array.from({ length: 3 }, (_, index) => (
                <div
                  key={index}
                  className="rounded-md border bg-card px-2.5 py-1.5"
                >
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          ) : result.redemptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("redeemedByNoResults")}
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {result.redemptions.map((r, i) => (
                <p
                  key={`${r.username}-${i}`}
                  className="rounded-md border bg-card px-2.5 py-1.5 text-sm break-all"
                >
                  {r.username}
                </p>
              ))}
            </div>
          )}

          {result && (
            <PaginationFooter
              variant="ghost-compact"
              page={page}
              totalPages={result.totalPages}
              onPrev={() => setPage((p) => p - 1)}
              onNext={() => setPage((p) => p + 1)}
              label={t("redeemedByPage", {
                page,
                totalPages: result.totalPages,
              })}
            />
          )}
        </div>
      )}
    </div>
  );
}
