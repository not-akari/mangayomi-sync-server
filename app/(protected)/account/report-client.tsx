"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge, type badgeVariants } from "@/components/ui/badge";
import { ListRows } from "@/components/layout/page-section";
import { CollapsibleTrigger } from "@/components/layout/collapsible-row";
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
  messages?: ReportThreadMessage[];
}

const STATUS_LABEL_KEY: Record<ReportStatus, string> = {
  PENDING: "reportStatusPending",
  IN_PROGRESS: "reportStatusInProgress",
  COMPLETE: "reportStatusComplete",
  REJECTED: "reportStatusRejected",
};

const STATUS_TONE: Record<
  ReportStatus,
  NonNullable<VariantProps<typeof badgeVariants>["tone"]>
> = {
  PENDING: "muted",
  IN_PROGRESS: "info",
  COMPLETE: "success",
  REJECTED: "destructive",
};

export function ReportClient(): React.ReactElement {
  const t = useTranslations("Account");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [reports, setReports] = useState<Report[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function loadReports(): void {
    fetch("/api/reports")
      .then((response) => {
        if (!response.ok) throw new Error(`Request failed: ${response.status}`);
        return response.json() as Promise<{ reports: Report[] }>;
      })
      .then((data) => setReports(data.reports))
      .catch(() => setReports([]));
  }

  useEffect(() => {
    loadReports();
  }, []);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitted(false);
    setSubmitting(true);
    try {
      const response = await apiFetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message }),
      });
      if (!response.ok) {
        setError(
          await extractErrorMessage(response, t("reportSubmitFailedFallback")),
        );
        return;
      }
      setSubject("");
      setMessage("");
      setSubmitted(true);
      loadReports();
    } catch {
      setError(t("reportSubmitFailedFallback"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSendReply(
    reportId: string,
    replyMessage: string,
  ): Promise<void> {
    const response = await apiFetch(`/api/reports/${reportId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: replyMessage }),
    });
    if (!response.ok) {
      const err = await extractErrorMessage(
        response,
        t("reportSubmitFailedFallback"),
      );
      throw new Error(err);
    }
    loadReports();
  }

  return (
    <div className="space-y-4">
      <form method="post" onSubmit={handleSubmit} className="space-y-3">
        <Input
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          placeholder={t("reportSubjectPlaceholder")}
          maxLength={200}
          required
          disabled={submitting}
        />
        <Textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={t("reportMessagePlaceholder")}
          maxLength={5000}
          required
          disabled={submitting}
          rows={4}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        {submitted && (
          <p className="text-sm text-muted-foreground">
            {t("reportSubmitted")}
          </p>
        )}
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          disabled={submitting}
        >
          {t("reportSubmit")}
        </Button>
      </form>

      {reports.length > 0 && (
        <div className="space-y-2 pt-2">
          <p className="text-sm font-medium">{t("reportHistoryTitle")}</p>
          <ListRows>
            {reports.map((report) => (
              <UserReportRow
                key={report.id}
                report={report}
                onSendReply={(msg) => handleSendReply(report.id, msg)}
              />
            ))}
          </ListRows>
        </div>
      )}
    </div>
  );
}

function UserReportRow({
  report,
  onSendReply,
}: {
  report: Report;
  onSendReply: (message: string) => Promise<void>;
}): React.ReactElement {
  const t = useTranslations("Account");
  const [open, setOpen] = useState(false);
  const repliesCount = report.messages?.length ?? 0;

  return (
    <div>
      <CollapsibleTrigger
        open={open}
        onToggle={() => setOpen((o) => !o)}
        className="px-4 py-3"
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
          <span className="min-w-0 truncate text-sm font-medium">
            {report.subject}
          </span>
          <Badge tone={STATUS_TONE[report.status]}>
            {t(STATUS_LABEL_KEY[report.status])}
          </Badge>
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
      {open && (
        <div className="border-t bg-muted/20 px-4 py-3">
          <ReportThread
            originalMessage={report.message}
            originalCreatedAt={report.createdAt}
            reporterLabel={t("reportOriginalMessage")}
            adminNote={report.adminNote}
            adminNoteLabel={t("reportAdminNote")}
            messages={report.messages}
            adminBadgeLabel={t("reportAdminBadge")}
            userBadgeLabel={t("reportYouBadge")}
            onSendReply={onSendReply}
            replyPlaceholder={t("reportReplyPlaceholder")}
            replySendLabel={t("reportReplySend")}
            replyHint={t("reportReplyHint")}
          />
        </div>
      )}
    </div>
  );
}
