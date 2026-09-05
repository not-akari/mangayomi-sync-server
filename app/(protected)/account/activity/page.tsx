"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ListRows, ListRow } from "@/components/layout/page-section";
import { PaginationFooter } from "@/components/layout/pagination-footer";
import { ListState } from "@/components/layout/list-state";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import { PageShell, PageHeader } from "@/components/layout/page-shell";

interface ActivityEntry {
  id: string;
  description: string;
  createdAt: string;
}

export default function AccountActivityPage(): React.ReactElement {
  const t = useTranslations("Account");
  const [page, setPage] = useState(1);
  const { result, error } = usePaginatedList<{
    entries: ActivityEntry[];
    total: number;
    totalPages: number;
  }>("/api/account/activity", page, "");

  return (
    <PageShell className="gap-4">
      <PageHeader
        title={t("activityTitle")}
        description={t("activityDescription")}
      />

      <ListState
        error={error}
        loading={result === null}
        empty={result?.entries.length === 0}
        errorLabel={t("actionFailedFallback")}
        loadingLabel={t("activityLoading")}
        emptyLabel={t("activityEmpty")}
        skeleton={"rows"}
        skeletonCount={8}
      />

      {result && result.entries.length > 0 && (
        <ListRows>
          {result.entries.map((entry) => (
            <ListRow
              key={entry.id}
              className="flex items-center justify-between gap-4"
            >
              <p className="text-sm">{entry.description}</p>
              <p className="shrink-0 text-sm text-muted-foreground">
                {new Date(entry.createdAt).toLocaleString()}
              </p>
            </ListRow>
          ))}
        </ListRows>
      )}

      {result && (
        <PaginationFooter
          variant="ghost"
          page={page}
          totalPages={result.totalPages}
          onPrev={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
          label={t("activityPage", { page, totalPages: result.totalPages })}
        />
      )}
    </PageShell>
  );
}
