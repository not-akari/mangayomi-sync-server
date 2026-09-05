"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { TriangleAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CatalogCover } from "@/components/layout/catalog-cover";
import { PaginationFooter } from "@/components/layout/pagination-footer";
import { SelectionToolbar } from "@/components/layout/selection-toolbar";
import { apiFetch } from "@/lib/auth/csrf-client";
import { cn } from "@/lib/utils";
import { catalogNsfwBadge } from "@/lib/moderation/catalog-badge";
import { ConfirmDialog } from "@/components/layout/confirm-dialog";
import type { AdminCatalogEntry } from "@/types/api";
import { PageShell, PageHeader } from "@/components/layout/page-shell";
import { ListState } from "@/components/layout/list-state";

export default function AdminLibraryPage(): React.ReactElement {
  const t = useTranslations("Admin");
  const [acknowledged, setAcknowledged] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [overriddenOnly, setOverriddenOnly] = useState(false);
  const [blur, setBlur] = useState(true);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [result, setResult] = useState<{
    entries: AdminCatalogEntry[];
    totalPages: number;
  } | null>(null);
  const [error, setError] = useState(false);
  const [pendingBulk, setPendingBulk] = useState<{
    override: boolean | null;
  } | null>(null);

  // Reset selection when page or filters change.
  const selectionResetKey = `${page}:${search}:${overriddenOnly}`;
  const [prevSelectionResetKey, setPrevSelectionResetKey] =
    useState(selectionResetKey);
  if (selectionResetKey !== prevSelectionResetKey) {
    setPrevSelectionResetKey(selectionResetKey);
    setSelected(new Set());
  }

  useEffect(() => {
    if (!acknowledged) return;
    let cancelled = false;
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.set("search", search);
    if (overriddenOnly) params.set("overriddenOnly", "true");
    fetch(`/api/admin/catalog-library?${params}`)
      .then((response) => {
        if (!response.ok) throw new Error(`Request failed: ${response.status}`);
        return response.json() as Promise<{
          entries: AdminCatalogEntry[];
          totalPages: number;
        }>;
      })
      .then((data) => {
        if (!cancelled) setResult(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [acknowledged, page, search, overriddenOnly]);

  async function setOverride(
    id: number,
    override: boolean | null,
  ): Promise<void> {
    setResult((prev) =>
      prev
        ? {
            ...prev,
            entries: prev.entries.map((e) =>
              e.id === id
                ? {
                    ...e,
                    nsfwOverride: override,
                    isNsfw: override ?? e.heuristicNsfw,
                  }
                : e,
            ),
          }
        : prev,
    );
    await apiFetch(`/api/admin/catalog-library/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ override }),
    });
  }

  function toggleSelected(id: number): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllOnPage(): void {
    if (!result) return;
    setSelected(new Set(result.entries.map((e) => e.id)));
  }

  function overrideLabel(override: boolean | null): string {
    if (override === null) return t("library.actionAuto");
    return override ? t("library.actionNsfw") : t("library.actionSafe");
  }

  async function bulkSetOverride(override: boolean | null): Promise<void> {
    const ids = [...selected];
    if (ids.length === 0) return;

    setResult((prev) =>
      prev
        ? {
            ...prev,
            entries: prev.entries.map((e) =>
              selected.has(e.id)
                ? {
                    ...e,
                    nsfwOverride: override,
                    isNsfw: override ?? e.heuristicNsfw,
                  }
                : e,
            ),
          }
        : prev,
    );
    setSelected(new Set());
    await apiFetch("/api/admin/catalog-library/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, override }),
    });
  }

  if (!acknowledged) {
    return (
      <PageShell className="max-w-lg items-start justify-center gap-4 py-16">
        <TriangleAlert
          className="size-10 text-muted-foreground"
          aria-hidden="true"
        />
        <h1 className="text-2xl font-bold tracking-tight">
          {t("library.warningTitle")}
        </h1>
        <p className="max-w-[60ch] text-sm text-muted-foreground">
          {t("library.warningBody")}
        </p>
        <Button onClick={() => setAcknowledged(true)}>
          {t("library.warningContinue")}
        </Button>
      </PageShell>
    );
  }

  return (
    <PageShell width="wide" className="gap-4">
      <PageHeader title={t("tabs.library")} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder={t("library.searchPlaceholder")}
          className="sm:max-w-xs"
        />
        <div className="flex flex-wrap items-center gap-2">
          {selectMode && (
            <Button size="sm" variant="secondary" onClick={selectAllOnPage}>
              {t("library.selectAllPage")}
            </Button>
          )}
          <Button
            size="sm"
            variant={blur ? "default" : "outline"}
            onClick={() => setBlur((v) => !v)}
          >
            {t("library.blurToggle")}
          </Button>
          <Button
            size="sm"
            variant={overriddenOnly ? "default" : "outline"}
            onClick={() => {
              setOverriddenOnly((v) => !v);
              setPage(1);
            }}
          >
            {t("library.overriddenOnly")}
          </Button>
          <Button
            size="sm"
            variant={selectMode ? "default" : "outline"}
            onClick={() => {
              setSelectMode((v) => !v);
              setSelected(new Set());
            }}
          >
            {t("library.selectMode")}
          </Button>
        </div>
      </div>

      {selectMode && (
        <SelectionToolbar
          count={selected.size}
          label={t("library.selected", { count: selected.size })}
          onClear={() => setSelected(new Set())}
          clearLabel={t("logFilters.clear")}
        >
          <Button
            size="sm"
            variant="secondary"
            disabled={selected.size === 0}
            onClick={() => setPendingBulk({ override: null })}
          >
            {t("library.bulkAuto")}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={selected.size === 0}
            onClick={() => setPendingBulk({ override: true })}
          >
            {t("library.bulkNsfw")}
          </Button>
          <Button
            size="sm"
            disabled={selected.size === 0}
            onClick={() => setPendingBulk({ override: false })}
          >
            {t("library.bulkSafe")}
          </Button>
        </SelectionToolbar>
      )}

      <ListState
        error={error}
        loading={result === null}
        empty={result !== null && result.entries.length === 0}
        errorLabel={t("library.error")}
        emptyLabel={t("library.empty")}
        loadingLabel={t("library.loading")}
        skeleton="grid"
        skeletonCount={12}
      />


      <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-4">
        {result?.entries.map((entry) => {
          const badge = catalogNsfwBadge(entry, {
            manual: t("library.badgeManual"),
            falsePositive: t("library.badgeFalse"),
            auto: t("library.badgeAuto"),
          });
          const blurred = blur && entry.isNsfw;
          const isSelected = selected.has(entry.id);
          return (
            <div key={entry.id} className="group flex flex-col gap-1.5">
              <div
                className="relative"
                onClick={
                  selectMode ? () => toggleSelected(entry.id) : undefined
                }
              >
                <CatalogCover
                  src={entry.imageUrl}
                  alt={entry.name ?? ""}
                  className={cn(
                    "aspect-[2/3] w-full rounded-md object-cover",
                    blurred &&
                      "blur-lg transition-[filter] duration-200 hover:blur-none",
                    selectMode && "cursor-pointer",
                    isSelected && "ring-primary ring-2",
                  )}
                />
                {selectMode && (
                  <div
                    className="absolute top-1.5 left-1.5 z-10 rounded bg-background/80 p-0.5 backdrop-blur-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelected(entry.id)}
                      aria-label={entry.name ?? "entry"}
                    />
                  </div>
                )}
                {badge && (
                  <span
                    className={cn(
                      "absolute top-1 right-1 left-1 truncate rounded-full px-2 py-0.5 text-center text-[9px] leading-4 font-medium",
                      badge.tone,
                    )}
                  >
                    {badge.label}
                  </span>
                )}
                {!selectMode && (
                  <div className="absolute inset-x-0 bottom-0 flex gap-1 rounded-b-md bg-black/70 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      size="sm"
                      variant={
                        entry.nsfwOverride === null ? "default" : "outline"
                      }
                      className="h-6 flex-1 px-1 text-[10px]"
                      onClick={() => setOverride(entry.id, null)}
                    >
                      {t("library.actionAuto")}
                    </Button>
                    <Button
                      size="sm"
                      variant={
                        entry.nsfwOverride === true ? "default" : "outline"
                      }
                      className="h-6 flex-1 px-1 text-[10px]"
                      onClick={() => setOverride(entry.id, true)}
                    >
                      {t("library.actionNsfw")}
                    </Button>
                    <Button
                      size="sm"
                      variant={
                        entry.nsfwOverride === false ? "default" : "outline"
                      }
                      className="h-6 flex-1 px-1 text-[10px]"
                      onClick={() => setOverride(entry.id, false)}
                    >
                      {t("library.actionSafe")}
                    </Button>
                  </div>
                )}
              </div>
              <p className="line-clamp-2 text-sm font-medium">{entry.name}</p>
            </div>
          );
        })}
      </div>

      {result !== null && (
        <PaginationFooter
          page={page}
          totalPages={result.totalPages}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(result.totalPages, p + 1))}
          label={t("library.page", { page, totalPages: result.totalPages })}
        />
      )}

      <ConfirmDialog
        open={pendingBulk !== null}
        destructive
        message={t("library.bulkConfirm", {
          count: selected.size,
          value: pendingBulk ? overrideLabel(pendingBulk.override) : "",
        })}
        onCancel={() => setPendingBulk(null)}
        onConfirm={() => {
          const pending = pendingBulk;
          setPendingBulk(null);
          if (pending) void bulkSetOverride(pending.override);
        }}
      />
    </PageShell>
  );
}
