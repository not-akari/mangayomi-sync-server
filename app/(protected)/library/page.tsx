"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CatalogCover } from "@/components/layout/catalog-cover";
import { PaginationFooter } from "@/components/layout/pagination-footer";
import { PageShell, PageHeader } from "@/components/layout/page-shell";
import { ListState } from "@/components/layout/list-state";
import { MangaDetailDialog } from "./manga-detail-dialog";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import type { LibraryEntry } from "@/types/api";
import { SEARCH_DEBOUNCE_MS } from "@/lib/config";

const ITEM_TYPES = [
  { value: null, labelKey: "filterAll" as const },
  { value: "MANGA", labelKey: "filterManga" as const },
  { value: "ANIME", labelKey: "filterAnime" as const },
  { value: "NOVEL", labelKey: "filterNovel" as const },
];

export default function LibraryPage(): React.ReactElement {
  const t = useTranslations("LibraryPage");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);
  const [itemType, setItemType] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const { result, error } = usePaginatedList<{
    entries: LibraryEntry[];
    totalPages: number;
    blurNsfw: boolean;
  }>("/api/library", page, debouncedSearch, { itemType });

  return (
    <PageShell width="full" className="gap-4">
      <PageHeader title={t("title")} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder={t("searchPlaceholder")}
          className="sm:max-w-xs"
        />
        <div className="flex gap-1">
          {ITEM_TYPES.map(({ value, labelKey }) => (
            <Button
              key={labelKey}
              size="sm"
              variant={itemType === value ? "default" : "outline"}
              onClick={() => {
                setItemType(value);
                setPage(1);
              }}
            >
              {t(labelKey)}
            </Button>
          ))}
        </div>
      </div>

      <ListState
        error={error}
        loading={result === null}
        empty={result?.entries.length === 0}
        errorLabel={t("error")}
        loadingLabel={t("loading")}
        emptyLabel={t("empty")}
        skeleton={"grid"}
        skeletonCount={12}
      />

      <div className="grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(140px,1fr))] sm:gap-4">
        {result?.entries.map((entry) => {
          const blurred = result.blurNsfw && entry.isLikelyNsfw;
          return (
            <button
              key={entry.clientId}
              type="button"
              onClick={() => setSelectedClientId(entry.clientId)}
              className="flex flex-col gap-1.5 text-left"
            >
              <CatalogCover
                src={entry.imageUrl}
                alt={entry.name ?? ""}
                className={cn(
                  "aspect-[2/3] w-full rounded-md object-cover",
                  // Blur eases off on hover instead of needing a separate click-to-reveal control.
                  blurred &&
                    "blur-lg transition-[filter] duration-200 hover:blur-none",
                )}
              />
              <p className="line-clamp-2 text-sm font-medium">{entry.name}</p>
            </button>
          );
        })}
      </div>

      {result !== null && (
        <PaginationFooter
          page={page}
          totalPages={result.totalPages}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(result.totalPages, p + 1))}
          label={t("page", { page, totalPages: result.totalPages })}
        />
      )}

      <MangaDetailDialog
        clientId={selectedClientId}
        onOpenChange={(open) => {
          if (!open) setSelectedClientId(null);
        }}
      />
    </PageShell>
  );
}
