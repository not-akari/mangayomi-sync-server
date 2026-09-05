"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge, type badgeVariants } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTab, TabsPanel } from "@/components/ui/tabs";
import { PageShell, PageHeader } from "@/components/layout/page-shell";
import { ListRows } from "@/components/layout/page-section";
import { ListState } from "@/components/layout/list-state";
import { CollapsibleTrigger } from "@/components/layout/collapsible-row";
import { SelectionToolbar } from "@/components/layout/selection-toolbar";
import {
  ReportThread,
  type ReportThreadMessage,
} from "@/components/layout/report-thread";
import { apiFetch } from "@/lib/auth/csrf-client";
import { extractErrorMessage } from "@/lib/api/api-error-client";
import type { ReportStatus } from "@prisma/client";
import type { VariantProps } from "class-variance-authority";

interface Report {
  id: string;
  subject: string;
  message: string;
  status: ReportStatus;
  adminNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
  user: { username: string } | null;
  contactUsername: string | null;
  contactInfo: string | null;
  messages?: ReportThreadMessage[];
}

const ACTIVE_STATUSES: ReportStatus[] = ["PENDING", "IN_PROGRESS"];

// Status to Badge tone mapping.
const STATUS_TONE: Record<
  ReportStatus,
  NonNullable<VariantProps<typeof badgeVariants>["tone"]>
> = {
  PENDING: "muted",
  IN_PROGRESS: "info",
  COMPLETE: "success",
  REJECTED: "destructive",
};

export default function AdminReportsPage(): React.ReactElement {
  const t = useTranslations("AdminReports");
  const [reports, setReports] = useState<Report[] | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkNote, setBulkNote] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch("/api/admin/reports");
      if (!response.ok) {
        setReports([]);
        return;
      }
      const data: { reports: Report[] } = await response.json();
      setReports(data.reports);
    } catch {
      setReports([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/reports")
      .then((response) => {
        if (!response.ok) throw new Error(`Request failed: ${response.status}`);
        return response.json() as Promise<{ reports: Report[] }>;
      })
      .then((data) => {
        if (!cancelled) setReports(data.reports);
      })
      .catch(() => {
        if (!cancelled) setReports([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleSelect = useCallback((id: string, checked: boolean): void => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  async function handleBulkStatus(status: ReportStatus): Promise<void> {
    setBulkSaving(true);
    setBulkError(null);
    try {
      const response = await apiFetch("/api/admin/reports/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          status,
          adminNote: bulkNote.trim() || null,
        }),
      });
      if (!response.ok) {
        setBulkError(
          await extractErrorMessage(response, t("statusUpdateFailedFallback")),
        );
        return;
      }
      setSelectedIds(new Set());
      setBulkNote("");
      await load();
    } finally {
      setBulkSaving(false);
    }
  }

  const { active, closed } = useMemo(() => {
    const all = reports ?? [];
    return {
      active: all.filter((r) => ACTIVE_STATUSES.includes(r.status)),
      closed: all.filter((r) => !ACTIVE_STATUSES.includes(r.status)),
    };
  }, [reports]);

  return (
    <PageShell width="wide" className="gap-4">
      <PageHeader title={t("title")} />

      <ListState
        loading={reports === null}
        empty={reports?.length === 0}
        emptyLabel={t("empty")}
        loadingLabel={t("loading")}
        skeletonCount={5}
      />

      {reports !== null && reports.length > 0 && (
        <Tabs defaultValue="active">
          <TabsList>
            <TabsTab value="active">
              {t("groupActive", { count: active.length })}
            </TabsTab>
            <TabsTab value="closed">
              {t("groupClosed")}
              <span className="text-xs text-muted-foreground tabular-nums">
                {closed.length}
              </span>
            </TabsTab>
          </TabsList>

          <TabsPanel value="active" className="flex flex-col gap-3 pt-3">
            <SelectionToolbar
              count={selectedIds.size}
              label={t("bulkSelected", { count: selectedIds.size })}
              onClear={() => setSelectedIds(new Set())}
              clearLabel={t("clearSelection")}
            >
              <Button
                variant="secondary"
                size="sm"
                disabled={bulkSaving}
                onClick={() => handleBulkStatus("IN_PROGRESS")}
              >
                {t("actionInProgress")}
              </Button>
              <Button
                size="sm"
                disabled={bulkSaving}
                onClick={() => handleBulkStatus("COMPLETE")}
              >
                {t("actionComplete")}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={bulkSaving}
                onClick={() => handleBulkStatus("REJECTED")}
              >
                {t("actionReject")}
              </Button>
              {selectedIds.size > 0 && (
                <Textarea
                  rows={1}
                  value={bulkNote}
                  onChange={(event) => setBulkNote(event.target.value)}
                  placeholder={t("adminNotePlaceholder")}
                  disabled={bulkSaving}
                  className="ml-2 min-w-48 basis-64"
                />
              )}
            </SelectionToolbar>
            {bulkError && (
              <p className="text-sm text-destructive">{bulkError}</p>
            )}
            {active.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("emptyActive")}
              </p>
            ) : (
              <ListRows>
                {active.map((report) => (
                  <ReportRow
                    key={report.id}
                    report={report}
                    onUpdated={load}
                    selected={selectedIds.has(report.id)}
                    onToggleSelect={toggleSelect}
                    selectable
                  />
                ))}
              </ListRows>
            )}
          </TabsPanel>

          <TabsPanel value="closed" className="pt-3">
            {closed.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("emptyClosed")}
              </p>
            ) : (
              <ListRows>
                {closed.map((report) => (
                  <ReportRow
                    key={report.id}
                    report={report}
                    onUpdated={load}
                    selected={false}
                    onToggleSelect={toggleSelect}
                    selectable={false}
                  />
                ))}
              </ListRows>
            )}
          </TabsPanel>
        </Tabs>
      )}
    </PageShell>
  );
}

function ReportRow({
  report,
  onUpdated,
  selected,
  onToggleSelect,
  selectable,
}: {
  report: Report;
  onUpdated: () => void;
  selected: boolean;
  onToggleSelect: (id: string, checked: boolean) => void;
  selectable: boolean;
}): React.ReactElement {
  const t = useTranslations("AdminReports");
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState(report.adminNote ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(status: ReportStatus): Promise<void> {
    setSaving(true);
    setError(null);
    try {
      const response = await apiFetch(`/api/admin/reports/${report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNote: note.trim() || null }),
      });
      if (!response.ok) {
        setError(
          await extractErrorMessage(response, t("statusUpdateFailedFallback")),
        );
        return;
      }
      onUpdated();
    } finally {
      setSaving(false);
    }
  }

  async function handleSendAdminReply(replyMessage: string): Promise<void> {
    const response = await apiFetch(
      `/api/admin/reports/${report.id}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyMessage }),
      },
    );
    if (!response.ok) {
      const err = await extractErrorMessage(
        response,
        t("statusUpdateFailedFallback"),
      );
      throw new Error(err);
    }
    onUpdated();
  }

  const isActive = ACTIVE_STATUSES.includes(report.status);
  const reporter =
    report.user?.username ??
    report.contactUsername ??
    t("unknownReporter");
  const repliesCount = report.messages?.length ?? 0;

  return (
    <div>
      <div className="flex items-stretch">
        {selectable && (
          <label
            className="flex items-center pl-4 pr-1"
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={selected}
              onCheckedChange={(checked) =>
                onToggleSelect(report.id, checked === true)
              }
              aria-label={t("selectReport")}
            />
          </label>
        )}
        <CollapsibleTrigger
          open={expanded}
          onToggle={() => setExpanded((v) => !v)}
          className={selectable ? "px-3 py-3" : "px-4 py-3"}
        >
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
            <span className="min-w-0 truncate font-medium">
              {report.subject}
            </span>
            <Badge tone={STATUS_TONE[report.status]}>
              {t(`status.${report.status}`)}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {reporter}
              {!report.user && (
                <Badge className="ml-2">{t("loggedOutBadge")}</Badge>
              )}
            </span>
            {repliesCount > 0 && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {repliesCount} {repliesCount === 1 ? "reply" : "replies"}
              </span>
            )}
            <time
              dateTime={report.createdAt}
              className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums"
            >
              {new Date(report.createdAt).toLocaleDateString()}
            </time>
          </div>
        </CollapsibleTrigger>
      </div>

      {expanded && (
        <div className="flex flex-col gap-4 border-t bg-muted/20 px-4 py-4">
          <ReportThread
            originalMessage={report.message}
            originalCreatedAt={report.createdAt}
            reporterLabel={reporter}
            contactInfo={report.contactInfo}
            adminNote={report.adminNote}
            adminNoteLabel={t("adminNoteLabel")}
            messages={report.messages}
            adminBadgeLabel={t("adminBadge")}
            userBadgeLabel={t("userBadge")}
            onSendReply={handleSendAdminReply}
            replyPlaceholder={t("reportReplyPlaceholder")}
            replySendLabel={t("reportReplySend")}
            replyHint={t("reportReplyHint")}
          />

          <div className="flex flex-col gap-2 border-t pt-3">
            <span className="text-xs font-semibold text-muted-foreground">
              {t("adminNoteLabel")} &amp; Status Actions
            </span>
            {isActive ? (
              <>
                <Textarea
                  rows={2}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder={t("adminNotePlaceholder")}
                  disabled={saving}
                />
                <div className="flex flex-wrap items-center gap-2">
                  {report.status === "PENDING" && (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={saving}
                      onClick={() => setStatus("IN_PROGRESS")}
                    >
                      {t("actionInProgress")}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    disabled={saving}
                    onClick={() => setStatus("COMPLETE")}
                  >
                    {t("actionComplete")}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={saving}
                    onClick={() => setStatus("REJECTED")}
                  >
                    {t("actionReject")}
                  </Button>
                  {error && (
                    <p className="ml-auto text-sm text-destructive">{error}</p>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={saving}
                  onClick={() => setStatus("PENDING")}
                >
                  {t("actionReopen")}
                </Button>
                {error && (
                  <p className="ml-auto text-sm text-destructive">{error}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
