"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { PageShell, PageHeader } from "@/components/layout/page-shell";
import { ListRow, ListRows } from "@/components/layout/page-section";
import { CatalogCover } from "@/components/layout/catalog-cover";
import { PaginationFooter } from "@/components/layout/pagination-footer";
import { ListState } from "@/components/layout/list-state";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import type { HistoryEntry } from "@/types/api";
import { SEARCH_DEBOUNCE_MS } from "@/lib/config";

export default function HistoryPage(): React.ReactElement {
  const t = useTranslations("HistoryPage");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);
  const [page, setPage] = useState(1);
  const { result, error } = usePaginatedList<{
    entries: HistoryEntry[];
    totalPages: number;
  }>("/api/history", page, debouncedSearch);

  return (
    <PageShell className="gap-4">
      <PageHeader title={t("title")} />

      <Input
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
        }}
        placeholder={t("searchPlaceholder")}
      />

      <ListState
        error={error}
        loading={result === null}
        empty={result?.entries.length === 0}
        errorLabel={t("error")}
        loadingLabel={t("loading")}
        emptyLabel={t("empty")}
        skeleton={"media-rows"}
        skeletonCount={6}
      />

      {result !== null && result.entries.length > 0 && (
        <ListRows>
          {result.entries.map((entry) => (
            <ListRow
              key={entry.clientId}
              className="flex items-center gap-3 py-2.5"
            >
              <CatalogCover
                src={entry.imageUrl}
                alt={entry.mangaName ?? ""}
                className="h-16 w-11 shrink-0 rounded object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{entry.mangaName}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {entry.chapterName}
                </p>
                {entry.date !== null && (
                  <p className="text-xs text-muted-foreground sm:hidden">
                    {new Date(entry.date).toLocaleString()}
                  </p>
                )}
              </div>
              {entry.date !== null && (
                <p className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                  {new Date(entry.date).toLocaleString()}
                </p>
              )}
            </ListRow>
          ))}
        </ListRows>
      )}

      {result !== null && (
        <PaginationFooter
          page={page}
          totalPages={result.totalPages}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(result.totalPages, p + 1))}
          label={t("page", { page, totalPages: result.totalPages })}
        />
      )}
    </PageShell>
  );
}
