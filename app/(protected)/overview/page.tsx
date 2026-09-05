import { getTranslations } from "next-intl/server";
import { getSessionUser } from "@/lib/auth/auth";
import { userStatsRepository } from "@/lib/repositories/user-stats-repository";
import { PageShell, PageHeader } from "@/components/layout/page-shell";
import { PageSection } from "@/components/layout/page-section";
import { StatCard } from "@/components/layout/stat-card";
import { ActivityHeatmap } from "@/components/layout/activity-heatmap";
import { StatBar } from "@/components/layout/stat-bar";
import { CatalogCover } from "@/components/layout/catalog-cover";
import { formatDuration } from "@/lib/formatters/format-duration";
import { ITEM_TYPE_STYLE } from "@/lib/formatters/item-type-style";
import { ACTIVITY_DAYS } from "@/lib/repositories/user-stats-repository";

export default async function OverviewPage(): Promise<React.ReactElement> {
  const [user, t] = await Promise.all([
    getSessionUser(),
    getTranslations("OverviewPage"),
  ]);
  // The layout already redirects anonymous visitors, so this only narrows the type.
  if (!user) return <PageShell />;

  const stats = await userStatsRepository.get(user.id);
  const typeTotal = stats.byType.reduce((sum, row) => sum + row.seconds, 0);
  const topMax = stats.topTitles[0]?.seconds ?? 0;
  const hasActivity = stats.totalEntries > 0;

  return (
    <PageShell width="wide">
      <PageHeader title={t("title")} description={t("description")} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          value={formatDuration(stats.totalSeconds)}
          label={t("totalTime")}
        />
        <StatCard value={stats.chaptersRead} label={t("chaptersRead")} />
        <StatCard value={stats.libraryTitles} label={t("libraryTitles")} />
        <StatCard value={stats.bookmarks} label={t("bookmarks")} />
        <StatCard value={stats.daysActive} label={t("daysActive")} />
        <StatCard value={stats.currentStreak} label={t("currentStreak")} />
        <StatCard value={stats.longestStreak} label={t("longestStreak")} />
      </div>

      {!hasActivity && (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      )}

      {hasActivity && (
        <>
          <PageSection
            title={t("activityTitle")}
            description={t("activityHint")}
          >
            <ActivityHeatmap
              days={stats.daily}
              today={new Date().toISOString().slice(0, 10)}
              spanDays={ACTIVITY_DAYS}
              legendLess={t("legendLess")}
              legendMore={t("legendMore")}
            />
          </PageSection>

          {typeTotal > 0 && (
            <PageSection title={t("byTypeTitle")}>
              <div className="flex flex-col gap-3">
                {stats.byType.map((row) => (
                  <StatBar
                    key={row.itemType}
                    label={t(`itemType.${row.itemType}`)}
                    value={formatDuration(row.seconds)}
                    fraction={row.seconds / typeTotal}
                    icon={ITEM_TYPE_STYLE[row.itemType].icon}
                    barClassName={ITEM_TYPE_STYLE[row.itemType].bar}
                  />
                ))}
              </div>
            </PageSection>
          )}

          {stats.topTitles.length > 0 && (
            <PageSection title={t("topTitlesTitle")}>
              <div className="flex flex-col gap-3">
                {stats.topTitles.map((title) => (
                  <div key={title.name} className="flex items-center gap-3">
                    <CatalogCover
                      src={title.imageUrl}
                      alt={title.name ?? ""}
                      className="h-14 w-10 shrink-0 rounded object-cover"
                    />
                    <StatBar
                      className="min-w-0 flex-1"
                      label={title.name ?? t("untitled")}
                      value={formatDuration(title.seconds)}
                      fraction={topMax === 0 ? 0 : title.seconds / topMax}
                      icon={ITEM_TYPE_STYLE[title.itemType].icon}
                      barClassName={ITEM_TYPE_STYLE[title.itemType].bar}
                    />
                  </div>
                ))}
              </div>
            </PageSection>
          )}
        </>
      )}
    </PageShell>
  );
}
