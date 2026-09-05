import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowUpCircle, ArrowRight } from "lucide-react";
import { userRepository } from "@/lib/repositories/user-repository";
import { sessionRepository } from "@/lib/repositories/session-repository";
import { inviteRepository } from "@/lib/repositories/invite-repository";
import { statsRepository, SERVER_ACTIVITY_DAYS } from "@/lib/repositories/stats-repository";
import { reportRepository } from "@/lib/repositories/report-repository";
import { auditLogRepository } from "@/lib/repositories/audit-log-repository";
import { serverSettingsRepository } from "@/lib/repositories/server-settings-repository";
import { formatBytes } from "@/lib/formatters/format-bytes";
import { checkForUpdate } from "@/lib/services/update-check";
import { isInviteActive } from "@/lib/formatters/invite-status";
import { describeAuditLog } from "@/lib/formatters/audit-log-describe";
import { ITEM_TYPE_STYLE } from "@/lib/formatters/item-type-style";
import { MetricTile } from "@/components/layout/metric-tile";
import { ActivityHeatmap } from "@/components/layout/activity-heatmap";
import { PageShell, PageHeader } from "@/components/layout/page-shell";
import { PageSection } from "@/components/layout/page-section";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import packageJson from "@/package.json";

export default async function AdminOverviewPage(): Promise<React.ReactElement> {
  const t = await getTranslations("Admin");
  const tOverview = await getTranslations("OverviewPage");
  const tReports = await getTranslations("AdminReports");
  const [
    settings,
    totalUsers,
    activeSessions,
    invites,
    mangaByType,
    chaptersByType,
    databaseSizeBytes,
    syncVolume7d,
    nsfwStats,
    pendingReports,
    openReports,
    dailyActivity,
    recentActivity,
    update,
  ] = await Promise.all([
    serverSettingsRepository.get(),
    userRepository.count(),
    sessionRepository.countActive(),
    inviteRepository.listAll(),
    statsRepository.countMangaByItemType(),
    statsRepository.countChaptersByItemType(),
    statsRepository.databaseSizeBytes(),
    statsRepository.syncVolume(7),
    statsRepository.nsfwStats(),
    reportRepository.countActive(),
    reportRepository.listOpenRecent(3),
    statsRepository.dailyServerActivity(SERVER_ACTIVITY_DAYS),
    auditLogRepository.listPage({ page: 1, pageSize: 5 }),
    checkForUpdate(),
  ]);
  const activeInvites = invites.filter(isInviteActive).length;

  return (
    <PageShell width="full">
      <PageHeader title={t("tabs.overview")} />

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex items-baseline gap-2">
                <h2 className="text-lg font-semibold">
                  {settings.siteName || t("overview.noServerName")}
                </h2>
                <span className="text-sm text-muted-foreground">
                  · v{packageJson.version}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                {settings.publicAppUrl && (
                  <span className="truncate">{settings.publicAppUrl}</span>
                )}
                <Badge tone="muted" className="shrink-0">
                  {settings.registrationMode === "OPEN"
                    ? t("overview.registrationOpen")
                    : t("overview.registrationInvite")}
                </Badge>
                {settings.maintenanceMode && (
                  <Badge tone="warning" className="shrink-0">
                    {t("overview.maintenanceOn")}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {update.updateAvailable && update.latestVersion && (
            <a
              href={update.latestUrl ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 hover:bg-primary/10"
            >
              <ArrowUpCircle className="size-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {t("overview.updatesAvailable")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("overview.updateBody", {
                    version: update.latestVersion,
                    current: update.currentVersion,
                  })}
                </p>
              </div>
            </a>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MetricTile
          value={totalUsers}
          label={t("overview.totalUsers")}
          href="/admin/users"
        />
        <MetricTile
          value={activeSessions}
          label={t("overview.activeSessions")}
        />
        <MetricTile
          value={activeInvites}
          label={t("overview.activeInvites")}
          href="/admin/invites"
        />
        <MetricTile
          value={formatBytes(databaseSizeBytes)}
          label={t("overview.databaseSize")}
        />
        <MetricTile
          value={syncVolume7d}
          label={t("overview.syncVolume7d")}
        />
        <MetricTile
          value={pendingReports}
          label={t("overview.openReports")}
          href="/admin/reports"
        />
      </div>

      <PageSection
        title={t("overview.activityTitle")}
        description={t("overview.activityHint")}
      >
        <ActivityHeatmap
          days={dailyActivity}
          today={new Date().toISOString().slice(0, 10)}
          spanDays={SERVER_ACTIVITY_DAYS}
          legendLess={t("overview.legendLess")}
          legendMore={t("overview.legendMore")}
        />
      </PageSection>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PageSection title={t("overview.contentComposition")}>
          <Card>
            <CardContent className="divide-y">
              {["MANGA", "ANIME", "NOVEL"].map((itemType) => {
                const count =
                  mangaByType[itemType as keyof typeof mangaByType];
                const chapterCount =
                  chaptersByType[itemType as keyof typeof chaptersByType];
                const Icon = ITEM_TYPE_STYLE[
                  itemType as keyof typeof ITEM_TYPE_STYLE
                ].icon;
                return (
                  <div
                    key={itemType}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className="size-5 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {tOverview(`itemType.${itemType}`)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {chapterCount.toLocaleString()}{" "}
                          {itemType === "ANIME" ? "episodes" : "chapters"}
                        </span>
                      </div>
                    </div>
                    <span className="text-2xl font-semibold tabular-nums">
                      {count.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </PageSection>

        <PageSection title={t("overview.moderationTitle")}>
          <Card>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("overview.autoFlagged")}
                </span>
                <span className="text-2xl font-semibold tabular-nums">
                  {nsfwStats.autoFlagged}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("overview.manualNsfw")}
                </span>
                <span className="text-2xl font-semibold tabular-nums">
                  {nsfwStats.manualNsfw}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("overview.manualSafe")}
                </span>
                <span className="text-2xl font-semibold tabular-nums">
                  {nsfwStats.manualSafe}
                </span>
              </div>
              <Link
                href="/admin/library"
                className="flex items-center gap-1 text-sm text-primary hover:underline mt-2"
              >
                {t("overview.viewAll")}
                <ArrowRight className="size-4" />
              </Link>
            </CardContent>
          </Card>
        </PageSection>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PageSection
          title={t("overview.recentActivity")}
          headerExtra={
            <Link
              href="/admin/logs"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              {t("overview.seeAll")}
              <ArrowRight className="size-4" />
            </Link>
          }
        >
          <Card>
            <CardContent className="divide-y">
              {recentActivity.entries.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {t("overview.noRecentActivity")}
                </p>
              )}
              {recentActivity.entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <span className="min-w-0 flex-1 text-sm">
                    {describeAuditLog(entry, t)}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </PageSection>

        <PageSection
          title={t("tabs.reports")}
          headerExtra={
            <Link
              href="/admin/reports"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              {t("overview.seeAll")}
              <ArrowRight className="size-4" />
            </Link>
          }
        >
          <Card>
            <CardContent className="divide-y">
              {openReports.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {tReports("emptyActive")}
                </p>
              )}
              {openReports.map((report) => (
                <Link
                  key={report.id}
                  href={`/admin/reports?id=${report.id}`}
                  className="flex items-start justify-between gap-4 py-3 hover:bg-muted/30 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {report.subject}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {report.user?.username ||
                        report.contactUsername ||
                        "Anonymous"}
                    </p>
                  </div>
                  <Badge
                    tone={
                      report.status === "PENDING"
                        ? "warning"
                        : report.status === "IN_PROGRESS"
                          ? "info"
                          : "muted"
                    }
                    className="shrink-0"
                  >
                    {report.status}
                  </Badge>
                </Link>
              ))}
            </CardContent>
          </Card>
        </PageSection>
      </div>
    </PageShell>
  );
}
