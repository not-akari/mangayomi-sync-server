"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectOption } from "@/components/ui/select";
import {
  SettingRow,
  SettingsGroup,
} from "@/components/layout/setting-group";
import { CollapsibleTrigger } from "@/components/layout/collapsible-row";
import { apiFetch } from "@/lib/auth/csrf-client";
import { extractErrorMessage } from "@/lib/api/api-error-client";
import { isInviteActive, inviteMatchesSearch } from "@/lib/formatters/invite-status";
import { BYTES_PER_MB } from "@/lib/config";
import type { AdminScope } from "@prisma/client";
import { useAdminUser } from "../admin-user-context";
import { InviteCard } from "./invite-card";
import { EXPIRY_PRESETS } from "./types";
import { ALL_ADMIN_SCOPES } from "@/lib/auth/permissions";
import type { Invite, InvitePreset } from "./types";
import { PageShell, PageHeader } from "@/components/layout/page-shell";
import { ListRows, PageSection } from "@/components/layout/page-section";
import { ListState } from "@/components/layout/list-state";
import { SelectionToolbar } from "@/components/layout/selection-toolbar";

export default function AdminInvitesPage(): React.ReactElement {
  const { scopes: ownScopes } = useAdminUser();
  const t = useTranslations("AdminInvites");
  const tAdmin = useTranslations("Admin");
  const [invites, setInvites] = useState<Invite[] | null>(null);
  const [maxUses, setMaxUses] = useState("1");
  const [label, setLabel] = useState("");
  const [grantedScopes, setGrantedScopes] = useState<Set<AdminScope>>(
    new Set(),
  );
  const [expiresInDays, setExpiresInDays] = useState<number | null>(null);
  const [quotaOverrideMb, setQuotaOverrideMb] = useState("");
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRevoking, setBulkRevoking] = useState(false);
  const [presets, setPresets] = useState<InvitePreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [permissionsExpanded, setPermissionsExpanded] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [savingPreset, setSavingPreset] = useState(false);

  async function fetchPresets(): Promise<InvitePreset[]> {
    const response = await fetch("/api/admin/invites/presets");
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    const data: { presets: InvitePreset[] } = await response.json();
    return data.presets;
  }

  useEffect(() => {
    let cancelled = false;
    fetchPresets()
      .then((presets) => {
        if (!cancelled) setPresets(presets);
      })
      .catch(() => {
        if (!cancelled) setPresets([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function applyPreset(presetId: string): void {
    setSelectedPresetId(presetId);
    const preset = presets.find((p) => p.id === presetId);
    if (!preset) return;
    setMaxUses(preset.maxUses === null ? "" : String(preset.maxUses));
    setExpiresInDays(preset.expiresInDays);
    setGrantedScopes(new Set(preset.grantedScopes));
    setQuotaOverrideMb(
      preset.maxLibraryBytesOverride === null
        ? ""
        : String(preset.maxLibraryBytesOverride / BYTES_PER_MB),
    );
    if (preset.grantedScopes.length > 0) setPermissionsExpanded(true);
  }

  async function handleSavePreset(): Promise<void> {
    if (!presetName.trim()) return;
    setSavingPreset(true);
    setError(null);
    try {
      const response = await apiFetch("/api/admin/invites/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: presetName.trim(),
          maxUses: maxUses.trim() === "" ? null : Number(maxUses),
          expiresInDays,
          grantedScopes: Array.from(grantedScopes),
          maxLibraryBytesOverride:
            quotaOverrideMb.trim() === ""
              ? null
              : Math.round(Number(quotaOverrideMb) * BYTES_PER_MB),
        }),
      });
      if (!response.ok) {
        setError(
          await extractErrorMessage(response, t("createFailedFallback")),
        );
        return;
      }
      setPresetName("");
      setPresets(await fetchPresets());
    } finally {
      setSavingPreset(false);
    }
  }

  async function handleDeletePreset(id: string): Promise<void> {
    await apiFetch(`/api/admin/invites/presets/${id}`, { method: "DELETE" });
    if (selectedPresetId === id) setSelectedPresetId("");
    setPresets(await fetchPresets());
  }

  function toggleSelect(id: string, checked: boolean): void {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function fetchInvites(): Promise<Invite[]> {
    const response = await fetch("/api/admin/invites");
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    const data: { invites: Invite[] } = await response.json();
    return data.invites;
  }

  useEffect(() => {
    let cancelled = false;
    fetchInvites()
      .then((invites) => {
        if (!cancelled) setInvites(invites);
      })
      .catch(() => {
        if (!cancelled) setError(t("createFailedFallback"));
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  function toggleScope(scope: AdminScope, checked: boolean): void {
    setGrantedScopes((current) => {
      const next = new Set(current);
      if (checked) next.add(scope);
      else next.delete(scope);
      return next;
    });
  }

  async function handleCreate(): Promise<void> {
    setCreating(true);
    setError(null);
    try {
      const parsedMaxUses = maxUses.trim() === "" ? null : Number(maxUses);
      // Same rule as the user permissions panel: admin-ness is derived from having any scope granted.
      const grantedRole = grantedScopes.size > 0 ? "ADMIN" : "USER";
      const expiresAt =
        expiresInDays === null
          ? null
          : new Date(Date.now() + expiresInDays * 86_400_000).toISOString();
      await apiFetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maxUses: parsedMaxUses,
          label: label.trim() || null,
          grantedRole,
          grantedScopes: Array.from(grantedScopes),
          expiresAt,
          maxLibraryBytesOverride:
            quotaOverrideMb.trim() === ""
              ? null
              : Math.round(Number(quotaOverrideMb) * BYTES_PER_MB),
        }),
      });
      setLabel("");
      setGrantedScopes(new Set());
      setExpiresInDays(null);
      setQuotaOverrideMb("");
      setSelectedPresetId("");
      setInvites(await fetchInvites());
    } catch {
      setError(t("createFailedFallback"));
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: string): Promise<void> {
    setError(null);
    try {
      await apiFetch(`/api/admin/invites/${id}`, { method: "DELETE" });
      setInvites(await fetchInvites());
    } catch {
      setError(t("createFailedFallback"));
    }
  }

  async function handleBulkRevoke(): Promise<void> {
    setBulkRevoking(true);
    setError(null);
    try {
      await apiFetch("/api/admin/invites/bulk-revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      setSelectedIds(new Set());
      setInvites(await fetchInvites());
    } catch {
      setError(t("createFailedFallback"));
    } finally {
      setBulkRevoking(false);
    }
  }

  const { active, inactive } = useMemo(() => {
    const filtered = (invites ?? []).filter((invite) =>
      inviteMatchesSearch(invite, search),
    );
    return {
      active: filtered.filter((invite) => isInviteActive(invite)),
      inactive: filtered.filter((invite) => !isInviteActive(invite)),
    };
  }, [invites, search]);

  return (
    <PageShell width="wide">
      <PageHeader title={t("title")} description={t("pageDescription")} />

      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        <aside className="lg:w-80 lg:shrink-0">
          <div className="lg:sticky lg:top-8">
            <SettingsGroup title={t("createTitle")}>
              {presets.length > 0 && (
                <SettingRow
                  htmlFor="invite-preset"
                  label={t("presetLabel")}
                  layout="column"
                >
                  <div className="flex gap-2">
                    <Select
                      id="invite-preset"
                      className="min-w-0 flex-1"
                      value={selectedPresetId}
                      onChange={(event) => applyPreset(event.target.value)}
                    >
                      <SelectOption value="">{t("presetNone")}</SelectOption>
                      {presets.map((preset) => (
                        <SelectOption key={preset.id} value={preset.id}>
                          {preset.name}
                        </SelectOption>
                      ))}
                    </Select>
                    {selectedPresetId && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={t("presetDelete")}
                        className="shrink-0 px-2 text-destructive hover:text-destructive"
                        onClick={() => handleDeletePreset(selectedPresetId)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                </SettingRow>
              )}

              <SettingRow
                htmlFor="max-uses"
                label={t("maxUses")}
                layout="column"
              >
                <Input
                  id="max-uses"
                  value={maxUses}
                  onChange={(event) => setMaxUses(event.target.value)}
                  placeholder={t("maxUsesUnlimited")}
                />
              </SettingRow>

              <SettingRow
                htmlFor="invite-label"
                label={t("label")}
                layout="column"
              >
                <Input
                  id="invite-label"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder={t("labelPlaceholder")}
                />
              </SettingRow>

              <SettingRow label={t("expiresLabel")} layout="column">
                <div className="flex flex-wrap gap-1.5">
                  {EXPIRY_PRESETS.map((preset) => (
                    <Button
                      key={preset.key}
                      type="button"
                      size="sm"
                      variant={
                        expiresInDays === preset.days ? "default" : "secondary"
                      }
                      onClick={() => setExpiresInDays(preset.days)}
                    >
                      {t(`expiry.${preset.key}`)}
                    </Button>
                  ))}
                </div>
              </SettingRow>

              <SettingRow
                htmlFor="invite-quota"
                label={t("quotaLabel")}
                description={t("quotaDescription")}
                layout="column"
              >
                <Input
                  id="invite-quota"
                  type="number"
                  min={1}
                  value={quotaOverrideMb}
                  onChange={(event) => setQuotaOverrideMb(event.target.value)}
                  placeholder={tAdmin("settings.unlimited")}
                />
              </SettingRow>

              <div>
                <CollapsibleTrigger
                  open={permissionsExpanded}
                  onToggle={() => setPermissionsExpanded((e) => !e)}
                  className="px-(--card-spacing) py-3 text-sm font-medium"
                >
                  <span className="flex items-center gap-2">
                    {t("grantsPermissions")}
                    {grantedScopes.size > 0 && (
                      <Badge tone="primary">{grantedScopes.size}</Badge>
                    )}
                  </span>
                </CollapsibleTrigger>
                {permissionsExpanded && (
                  <div className="flex flex-col gap-2 px-(--card-spacing) pb-3">
                    {ALL_ADMIN_SCOPES.map((scope) => {
                      const grantable = ownScopes.includes(scope);
                      return (
                        <div
                          key={scope}
                          className="flex items-center justify-between gap-4"
                        >
                          <Label
                            htmlFor={`invite-scope-${scope}`}
                            className={
                              grantable ? undefined : "text-muted-foreground"
                            }
                          >
                            {tAdmin(`scopes.${scope}`)}
                          </Label>
                          <Switch
                            id={`invite-scope-${scope}`}
                            checked={grantedScopes.has(scope)}
                            disabled={!grantable}
                            onCheckedChange={(checked) =>
                              toggleScope(scope, checked)
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <SettingRow
                htmlFor="preset-name"
                label={t("presetSaveLabel")}
                description={t("presetSaveDescription")}
                layout="column"
              >
                <div className="flex gap-2">
                  <Input
                    id="preset-name"
                    className="min-w-0 flex-1"
                    value={presetName}
                    onChange={(event) => setPresetName(event.target.value)}
                    placeholder={t("presetNamePlaceholder")}
                    disabled={savingPreset}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="shrink-0"
                    disabled={savingPreset || !presetName.trim()}
                    onClick={handleSavePreset}
                  >
                    {t("presetSave")}
                  </Button>
                </div>
              </SettingRow>

              <div className="flex flex-col gap-2 bg-muted/40 px-(--card-spacing) py-3">
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button onClick={handleCreate} disabled={creating}>
                  {t("createInvite")}
                </Button>
              </div>
            </SettingsGroup>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {invites !== null && invites.length > 0 && (
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("searchPlaceholder")}
            />
          )}

          <ListState
            loading={invites === null}
            empty={invites?.length === 0}
            emptyLabel={t("empty")}
            loadingLabel={t("loading")}
            skeletonCount={5}
          />

          {active.length > 0 && (
            <div className="flex flex-col gap-3">
              <SelectionToolbar
                count={selectedIds.size}
                label={t("bulkSelected", { count: selectedIds.size })}
                onClear={() => setSelectedIds(new Set())}
                clearLabel={t("clearSelection")}
              >
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={bulkRevoking}
                  onClick={handleBulkRevoke}
                >
                  {t("revokeSelected", { count: selectedIds.size })}
                </Button>
              </SelectionToolbar>
              <PageSection title={t("groupActive")}>
                <ListRows>
                  {active.map((invite) => (
                    <InviteCard
                      key={invite.id}
                      invite={invite}
                      onRevoke={handleRevoke}
                      selected={selectedIds.has(invite.id)}
                      onToggleSelect={toggleSelect}
                    />
                  ))}
                </ListRows>
              </PageSection>
            </div>
          )}

          {inactive.length > 0 && (
            <PageSection title={t("groupInactive")}>
              <ListRows>
                {inactive.map((invite) => (
                  <InviteCard
                    key={invite.id}
                    invite={invite}
                    onRevoke={handleRevoke}
                    selected={false}
                    onToggleSelect={toggleSelect}
                  />
                ))}
              </ListRows>
            </PageSection>
          )}

          {invites !== null &&
            invites.length > 0 &&
            active.length === 0 &&
            inactive.length === 0 && (
              <p className="text-muted-foreground">{t("noResults")}</p>
            )}
        </div>
      </div>
    </PageShell>
  );
}
