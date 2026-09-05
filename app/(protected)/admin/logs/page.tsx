"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectOption } from "@/components/ui/select";
import { PaginationFooter } from "@/components/layout/pagination-footer";
import { ListState } from "@/components/layout/list-state";
import type { AuditAction } from "@prisma/client";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import { SEARCH_DEBOUNCE_MS } from "@/lib/config";
import { PageShell, PageHeader } from "@/components/layout/page-shell";
import { ListRows } from "@/components/layout/page-section";

interface LogEntry {
  id: string;
  action: AuditAction;
  description: string;
  createdAt: string;
}

// Destructive and notable action sets for tone highlighting.
const DESTRUCTIVE: ReadonlySet<string> = new Set([
  "ACCOUNT_DELETED",
  "ACCOUNT_SUSPENDED",
  "INVITE_REVOKED",
  "SESSION_REVOKED",
  "TOTP_DISABLED",
]);
const NOTABLE: ReadonlySet<string> = new Set([
  "ROLE_CHANGED",
  "SETTINGS_CHANGED",
  "PASSWORD_RESET_LINK_CREATED",
  "PASSWORD_RESET_REQUESTED",
  "PASSWORD_RESET_COMPLETED",
  "TOTP_RECOVERY_CODE_USED",
]);

function actionTone(action: AuditAction): "destructive" | "warning" | "muted" {
  if (DESTRUCTIVE.has(action)) return "destructive";
  if (NOTABLE.has(action)) return "warning";
  return "muted";
}

export default function AdminLogsPage(): React.ReactElement {
  const t = useTranslations("Admin");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const { result, error } = usePaginatedList<{
    entries: LogEntry[];
    total: number;
    totalPages: number;
    actions: AuditAction[];
  }>("/api/admin/logs", page, debouncedSearch, { action });

  const filtered = search !== "" || action !== "";

  // Group log entries by calendar day.
  const days = useMemo(() => {
    const buckets = new Map<string, LogEntry[]>();
    for (const entry of result?.entries ?? []) {
      const day = new Date(entry.createdAt).toLocaleDateString();
      const bucket = buckets.get(day);
      if (bucket) bucket.push(entry);
      else buckets.set(day, [entry]);
    }
    return Array.from(buckets, ([day, entries]) => ({ day, entries }));
  }, [result]);

  return (
    <PageShell width="wide" className="gap-4">
      <PageHeader
        title={t("logs.title")}
        description={t("logs.pageDescription")}
      />

      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-2">
        <Input
          className="min-w-48 flex-1"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder={t("logFilters.searchPlaceholder")}
        />
        <Select
          value={action}
          onChange={(event) => {
            setAction(event.target.value);
            setPage(1);
          }}
        >
          <SelectOption value="">{t("logFilters.allActions")}</SelectOption>
          {(result?.actions ?? []).map((value) => (
            <SelectOption key={value} value={value}>
              {t(`logFilters.actionLabels.${value}`)}
            </SelectOption>
          ))}
        </Select>
        {filtered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setAction("");
              setPage(1);
            }}
          >
            <X className="size-4" />
            {t("logFilters.clear")}
          </Button>
        )}
      </div>

      <ListState
        error={error}
        loading={result === null}
        empty={result?.entries.length === 0}
        errorLabel={t("logs.error")}
        loadingLabel={t("logs.loading")}
        emptyLabel={t("logs.empty")}
        skeleton={"rows"}
        skeletonCount={8}
      />

      {days.map(({ day, entries }) => (
        <section key={day} className="flex flex-col gap-2">
          <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {day}
          </h2>
          <ListRows>
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-col gap-1.5 px-4 py-3 sm:grid sm:grid-cols-[11rem_1fr_auto] sm:items-baseline sm:gap-4"
              >
                <Badge tone={actionTone(entry.action)} className="w-fit">
                  {t(`logFilters.actionLabels.${entry.action}`)}
                </Badge>
                <p className="min-w-0 flex-1 text-sm">{entry.description}</p>
                <time
                  dateTime={entry.createdAt}
                  className="shrink-0 text-xs text-muted-foreground tabular-nums"
                >
                  {new Date(entry.createdAt).toLocaleTimeString()}
                </time>
              </div>
            ))}
          </ListRows>
        </section>
      ))}

      {result && (
        <PaginationFooter
          variant="ghost"
          page={page}
          totalPages={result.totalPages}
          onPrev={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
          label={t("logFilters.page", { page, totalPages: result.totalPages })}
        />
      )}
    </PageShell>
  );
}
