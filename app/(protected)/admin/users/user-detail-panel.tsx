"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/auth/csrf-client";
import { extractErrorMessage } from "@/lib/api/api-error-client";
import { formatBytes } from "@/lib/formatters/format-bytes";
import { SettingRow } from "@/components/layout/setting-group";
import { Tabs, TabsList, TabsTab, TabsPanel } from "@/components/ui/tabs";
import type { AdminScope, ItemType, Role } from "@prisma/client";
import { BYTES_PER_MB } from "@/lib/config";
import { ALL_ADMIN_SCOPES } from "@/lib/auth/permissions";

import { AdminSessionsSection } from "./admin-sessions-section";

interface UserDetail {
  id: string;
  username: string;
  hasEmail: boolean;
  isPrimaryAdmin: boolean;
  avatarUrl: string | null;
  role: Role;
  scopes: AdminScope[];
  suspended: boolean;
  suspendedReason: string | null;
  createdAt: string;
  maxLibraryBytesOverride: number | null;
}

interface UserStats {
  libraryByType: Record<ItemType, number>;
  favorites: number;
  chaptersByType: Record<ItemType, number>;
  chaptersRead: number;
  chaptersReadByType: Record<ItemType, number>;
  chaptersTotal: number;
  dataSizeBytes: number;
}

export function UserDetailPanel({
  userId,
  isSelf,
  ownScopes,
  emailConfigured,
  onSaved,
}: {
  userId: string;
  isSelf: boolean;
  ownScopes: AdminScope[];
  emailConfigured: boolean;
  onSaved: () => void;
}): React.ReactElement {
  const t = useTranslations("Admin");
  const [detail, setDetail] = useState<{
    user: UserDetail;
    stats: UserStats;
    defaultMaxLibraryBytes: number | null;
  } | null>(null);
  const [scopes, setScopes] = useState<Set<AdminScope>>(new Set());
  const [suspended, setSuspended] = useState(false);
  const [suspendedReason, setSuspendedReason] = useState("");
  const [libraryQuotaMb, setLibraryQuotaMb] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [resetEmailed, setResetEmailed] = useState(false);
  const [generatingResetLink, setGeneratingResetLink] = useState<
    "link" | "email" | null
  >(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/users/${userId}`)
      .then((response) => {
        if (!response.ok) throw new Error(`Request failed: ${response.status}`);
        return response.json() as Promise<{
          user: UserDetail;
          stats: UserStats;
          defaultMaxLibraryBytes: number | null;
        }>;
      })
      .then((data) => {
        if (cancelled) return;
        setDetail(data);
        setScopes(new Set(data.user.scopes));
        setSuspended(data.user.suspended);
        setSuspendedReason(data.user.suspendedReason ?? "");
        setLibraryQuotaMb(
          data.user.maxLibraryBytesOverride === null
            ? ""
            : String(data.user.maxLibraryBytesOverride / BYTES_PER_MB),
        );
        setError(null);
      })
      .catch(() => {
        if (!cancelled) setError(t("actionFailedFallback"));
      });
    return () => {
      cancelled = true;
    };
  }, [userId, t]);

  async function handleGenerateResetLink(sendEmail: boolean): Promise<void> {
    setGeneratingResetLink(sendEmail ? "email" : "link");
    setResetLink(null);
    setResetEmailed(false);
    try {
      const response = await apiFetch(`/api/admin/users/${userId}/reset-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sendEmail }),
      });
      const data = (await response.json()) as {
        resetUrl: string;
        emailed: boolean;
      };
      setResetLink(data.resetUrl);
      setResetEmailed(data.emailed);
    } finally {
      setGeneratingResetLink(null);
    }
  }

  function toggleScope(scope: AdminScope, checked: boolean): void {
    setScopes((current) => {
      const next = new Set(current);
      if (checked) next.add(scope);
      else next.delete(scope);
      return next;
    });
  }

  async function handleSave(): Promise<void> {
    setSaving(true);
    setError(null);
    try {
      // Admin-ness is derived from having any scope at all, no separate switch to drift out of sync.
      const role: Role = scopes.size > 0 ? "ADMIN" : "USER";
      const trimmedQuota = libraryQuotaMb.trim();
      const maxLibraryBytesOverride =
        trimmedQuota === ""
          ? null
          : Math.round(Number(trimmedQuota) * BYTES_PER_MB);
      const response = await apiFetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          scopes: Array.from(scopes),
          suspended,
          suspendedReason: suspended ? suspendedReason.trim() || null : null,
          maxLibraryBytesOverride,
        }),
      });
      if (!response.ok) {
        setError(
          await extractErrorMessage(response, t("userDetail.saveFailed")),
        );
        return;
      }
      onSaved();
    } catch {
      setError(t("userDetail.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  if (!detail || detail.user.id !== userId) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label={t("loading")}
        className="flex flex-col gap-4 border-t bg-muted/20 px-4 py-4"
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="overflow-hidden rounded-lg border">
            <div className="border-b bg-muted/40 px-4 py-2.5">
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="flex flex-col gap-3 px-4 py-3">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const editable = !isSelf && !detail.user.isPrimaryAdmin;

  return (
    <div className="flex flex-col gap-4 border-t bg-muted/20 px-4 py-4">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-5">
        <Metric
          value={detail.stats.libraryByType.MANGA}
          label={t("overview.manga")}
          hint={t("userDetail.ofChaptersRead", {
            total: detail.stats.chaptersByType.MANGA,
          })}
          hintValue={detail.stats.chaptersReadByType.MANGA}
        />
        <Metric
          value={detail.stats.libraryByType.ANIME}
          label={t("overview.anime")}
          hint={t("userDetail.ofEpisodesWatched", {
            total: detail.stats.chaptersByType.ANIME,
          })}
          hintValue={detail.stats.chaptersReadByType.ANIME}
        />
        <Metric
          value={detail.stats.libraryByType.NOVEL}
          label={t("overview.novels")}
          hint={t("userDetail.ofChaptersRead", {
            total: detail.stats.chaptersByType.NOVEL,
          })}
          hintValue={detail.stats.chaptersReadByType.NOVEL}
        />
        <Metric
          value={detail.stats.favorites}
          label={t("userDetail.favorites")}
        />
        <Metric
          value={formatBytes(detail.stats.dataSizeBytes)}
          label={t("userDetail.dataSize")}
        />
      </div>

      {!isSelf && detail.user.isPrimaryAdmin && (
        <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
          {t("userDetail.primaryAdminLocked")}
        </p>
      )}

      <Tabs defaultValue={editable ? "permissions" : "access"}>
        <div className="overflow-hidden rounded-lg border bg-card [--card-spacing:--spacing(4)]">
          <TabsList>
            {editable && (
              <TabsTab value="permissions">
                {t("userDetail.permissionsTitle")}
                <span className="text-xs text-muted-foreground tabular-nums">
                  {t("userDetail.scopesGranted", {
                    count: scopes.size,
                    total: ALL_ADMIN_SCOPES.length,
                  })}
                </span>
              </TabsTab>
            )}
            {!isSelf && (
              <TabsTab value="access">{t("userDetail.accessTitle")}</TabsTab>
            )}
            {editable && (
              <TabsTab value="danger" className="ml-auto text-destructive/70 data-[active]:text-destructive data-[active]:border-destructive">
                {t("userDetail.dangerTitle")}
              </TabsTab>
            )}
          </TabsList>

          {editable && (
            <TabsPanel value="permissions" className="flex flex-col gap-5 p-4">
              <div className="flex flex-wrap gap-2">
                {ALL_ADMIN_SCOPES.map((scope) => {
                  const grantable = ownScopes.includes(scope);
                  const on = scopes.has(scope);
                  return (
                    <button
                      key={scope}
                      type="button"
                      role="switch"
                      aria-checked={on}
                      disabled={!grantable}
                      onClick={() => toggleScope(scope, !on)}
                      title={
                        grantable ? undefined : t("userDetail.scopeNotGrantable")
                      }
                      className={
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors outline-none " +
                        "focus-visible:ring-2 focus-visible:ring-ring/50 " +
                        "disabled:cursor-not-allowed disabled:opacity-50 " +
                        (on
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-input bg-transparent text-muted-foreground hover:text-foreground")
                      }
                    >
                      <span
                        aria-hidden="true"
                        className={
                          "grid size-4 place-items-center rounded-full text-[10px] font-bold transition-colors " +
                          (on
                            ? "bg-primary text-primary-foreground"
                            : "border border-current")
                        }
                      >
                        {on ? "✓" : ""}
                      </span>
                      {t(`scopes.${scope}`)}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`quota-${userId}`}>
                  {t("userDetail.libraryQuota")}
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    id={`quota-${userId}`}
                    type="number"
                    min={1}
                    className="w-32"
                    placeholder={t("settings.unlimited")}
                    value={libraryQuotaMb}
                    onChange={(event) => setLibraryQuotaMb(event.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {detail.defaultMaxLibraryBytes === null
                      ? t("userDetail.libraryQuotaDefaultUnlimited")
                      : t("userDetail.libraryQuotaDefault", {
                          count: Math.round(
                            detail.defaultMaxLibraryBytes / BYTES_PER_MB,
                          ),
                        })}
                  </p>
                </div>
              </div>
            </TabsPanel>
          )}

          {!isSelf && (
            <TabsPanel value="access" className="divide-y">
              <SettingRow
                label={t("userDetail.resetPassword")}
                description={`${t("userDetail.resetPasswordDescription")} ${
                  detail.user.hasEmail && emailConfigured
                    ? t("userDetail.emailOnFile")
                    : detail.user.hasEmail
                      ? t("userDetail.emailOnFileNoSmtp")
                      : t("userDetail.noEmailOnFile")
                }`}
              >
                <div className="flex shrink-0 flex-wrap gap-1.5">
                  {detail.user.hasEmail && emailConfigured && (
                    <Button
                      size="sm"
                      disabled={generatingResetLink !== null}
                      onClick={() => handleGenerateResetLink(true)}
                    >
                      {t("userDetail.resetPasswordEmailButton")}
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={generatingResetLink !== null}
                    onClick={() => handleGenerateResetLink(false)}
                  >
                    {t("userDetail.resetPasswordButton")}
                  </Button>
                </div>
              </SettingRow>
              {resetLink && (
                <div className="flex flex-col gap-1.5 px-4 py-3">
                  {resetEmailed && (
                    <p className="text-sm text-muted-foreground">
                      {t("userDetail.resetLinkEmailedHint")}
                    </p>
                  )}
                  <Input
                    readOnly
                    value={resetLink}
                    onFocus={(event) => event.target.select()}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("userDetail.resetLinkHint")}
                  </p>
                </div>
              )}
              <AdminSessionsSection userId={userId} />
            </TabsPanel>
          )}

          {editable && (
            <TabsPanel value="danger" className="divide-y">
              <SettingRow
                htmlFor={`suspend-${userId}`}
                label={t("userDetail.suspend")}
                description={t("userDetail.suspendDescription")}
                destructive
              >
                <Switch
                  id={`suspend-${userId}`}
                  checked={suspended}
                  onCheckedChange={setSuspended}
                />
              </SettingRow>
              {suspended && (
                <SettingRow
                  htmlFor={`suspend-reason-${userId}`}
                  label={t("userDetail.suspendReason")}
                  layout="column"
                >
                  <Input
                    id={`suspend-reason-${userId}`}
                    value={suspendedReason}
                    onChange={(event) => setSuspendedReason(event.target.value)}
                    placeholder={t("userDetail.suspendReasonPlaceholder")}
                    maxLength={500}
                  />
                </SettingRow>
              )}
            </TabsPanel>
          )}

          {editable && (
            <div className="flex flex-wrap items-center justify-end gap-3 border-t bg-muted/30 px-4 py-3">
              {error && (
                <p className="mr-auto text-sm text-destructive">{error}</p>
              )}
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {t("userDetail.save")}
              </Button>
            </div>
          )}
        </div>
      </Tabs>
    </div>
  );
}

function Metric({
  value,
  label,
  hint,
  hintValue,
}: {
  value: number | string;
  label: string;
  hint?: string;
  hintValue?: number;
}): React.ReactElement {
  return (
    <div className="flex flex-col gap-0.5 bg-card px-3 py-2.5">
      <span className="text-lg leading-none font-semibold tabular-nums">
        {value}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
      {hint && (
        <span className="text-xs text-muted-foreground/80">
          <span className="tabular-nums">{hintValue}</span> {hint}
        </span>
      )}
    </div>
  );
}
