"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Info, MoreHorizontal } from "lucide-react";
import * as icons from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { JsonEntries } from "@/components/ui/json-tree";
import { PageShell, PageHeader } from "@/components/layout/page-shell";
import { PageSection, ListRows } from "@/components/layout/page-section";
import { ListState } from "@/components/layout/list-state";
import { CollapsibleTrigger } from "@/components/layout/collapsible-row";
import {
  groupSettingsFields,
  GROUP_ICON_NAMES,
} from "@/lib/settings/settings-field-groups";

interface SettingsResponse {
  data: unknown;
  updatedAt: number | null;
}

function GroupIcon({ group }: { group: string }): React.ReactElement {
  const name = GROUP_ICON_NAMES[group];
  const Icon =
    (name && (icons as unknown as Record<string, icons.LucideIcon>)[name]) ||
    MoreHorizontal;
  return <Icon className="size-4 shrink-0 text-muted-foreground" />;
}

function GroupRow({
  group,
  entries,
}: {
  group: string;
  entries: [key: string, value: unknown][];
}): React.ReactElement {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <CollapsibleTrigger
        open={open}
        onToggle={() => setOpen((o) => !o)}
        className="px-4 py-3"
      >
        <div className="flex items-center gap-2.5">
          <GroupIcon group={group} />
          <span className="font-medium">{group}</span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {entries.length}
          </span>
        </div>
      </CollapsibleTrigger>
      {open && (
        <div className="border-t bg-muted/20 px-4 py-3">
          <JsonEntries entries={entries} />
        </div>
      )}
    </div>
  );
}

export default function SettingsPage(): React.ReactElement {
  const t = useTranslations("SettingsPage");
  const [result, setResult] = useState<SettingsResponse | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/account/settings")
      .then((response) => {
        if (!response.ok) throw new Error(`Request failed: ${response.status}`);
        return response.json() as Promise<SettingsResponse>;
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
  }, []);

  const groups =
    result?.data && typeof result.data === "object"
      ? groupSettingsFields(result.data as Record<string, unknown>)
      : null;

  return (
    <PageShell width="narrow">
      <PageHeader title={t("title")} description={t("message")} />

      <div className="flex items-center justify-between gap-3 rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
          <Info className="size-4 shrink-0" aria-hidden="true" />
          <span>{t("accountLink")}</span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          nativeButton={false}
          render={<Link href="/account" />}
        >
          {t("title")}
        </Button>
      </div>

      <PageSection title={t("dataTitle")} description={t("dataHint")}>
        <ListState
          error={error}
          loading={result === null}
          empty={result !== null && (groups === null || groups.length === 0)}
          errorLabel={t("error")}
          loadingLabel={t("loading")}
          emptyLabel={t("empty")}
          skeleton="rows"
          skeletonCount={5}
        />

        {groups !== null && groups.length > 0 && (
          <ListRows>
            {groups.map(({ group, entries }) => (
              <GroupRow key={group} group={group} entries={entries} />
            ))}
          </ListRows>
        )}
      </PageSection>
    </PageShell>
  );
}
