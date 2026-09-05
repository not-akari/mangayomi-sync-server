"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { apiFetch } from "@/lib/auth/csrf-client";
import { extractErrorMessage } from "@/lib/api/api-error-client";
import {
  useSettingField,
  useSettingToggle,
} from "@/hooks/use-setting-field";
import {
  boundedInt,
  commaList,
  megabytes,
  nullableBoundedInt,
  nullableMegabytes,
  nullableText,
} from "@/lib/settings/setting-parsers";
import { GeneralSection } from "./sections/general-section";
import { NetworkSection } from "./sections/network-section";
import { NsfwSection } from "./sections/nsfw-section";
import { SecuritySection } from "./sections/security-section";
import { AvatarsSection } from "./sections/avatars-section";
import { LibrarySection } from "./sections/library-section";
import { EmailSection } from "./sections/email-section";
import type { AdminSettingsInitial } from "@/types/api";
import { PageShell, PageHeader } from "@/components/layout/page-shell";
import { TabLayout } from "@/components/layout/nav-tabs";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  SlidersHorizontal,
  Globe,
  EyeOff,
  ShieldCheck,
  ImageIcon,
  Library,
  Mail,
  CheckCircle2,
  AlertCircle,
  Save,
  RotateCcw,
} from "lucide-react";

function areArraysDifferent(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return true;
  const setB = new Set(b);
  return a.some((item) => !setB.has(item));
}

function SettingsForm({
  initialSettings,
}: {
  initialSettings: AdminSettingsInitial;
}): React.ReactElement {
  const t = useTranslations("Admin");
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("general");
  const [notice, setNotice] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const siteName = useSettingField({
    initial: initialSettings.siteName,
    ...nullableText,
  });
  const publicAppUrl = useSettingField({
    initial: initialSettings.publicAppUrl,
    ...nullableText,
  });
  const allowedOrigins = useSettingField({
    initial: initialSettings.allowedOrigins ?? [],
    ...commaList,
  });
  const nsfwKeywords = useSettingField({
    initial: initialSettings.nsfwKeywords ?? [],
    ...commaList,
  });
  const nsfwSymbols = useSettingField({
    initial: initialSettings.nsfwSymbols ?? [],
    ...commaList,
  });
  const sessionDurationDays = useSettingField({
    initial: initialSettings.sessionDurationDays,
    ...boundedInt(1, 365),
  });
  const minPasswordLength = useSettingField({
    initial: initialSettings.minPasswordLength,
    ...boundedInt(1, 100),
  });
  const maxAvatarBytes = useSettingField({
    initial: initialSettings.maxAvatarBytes,
    ...megabytes,
  });
  const defaultMaxLibraryBytes = useSettingField({
    initial: initialSettings.defaultMaxLibraryBytes,
    ...nullableMegabytes,
  });
  const smtpHost = useSettingField({
    initial: initialSettings.smtpHost,
    ...nullableText,
  });
  const smtpPort = useSettingField({
    initial: initialSettings.smtpPort,
    ...nullableBoundedInt(1, 65535),
  });
  const smtpUser = useSettingField({
    initial: initialSettings.smtpUser,
    ...nullableText,
  });
  const smtpFrom = useSettingField({
    initial: initialSettings.smtpFrom,
    ...nullableText,
  });

  const openRegistration = useSettingToggle(
    initialSettings.registrationMode === "OPEN",
  );
  const maintenanceMode = useSettingToggle(initialSettings.maintenanceMode);
  const avatarsEnabled = useSettingToggle(initialSettings.avatarsEnabled);
  const allowAvatarUrl = useSettingToggle(initialSettings.allowAvatarUrl);
  const smtpSecure = useSettingToggle(initialSettings.smtpSecure);

  const [initialGenreTags, setInitialGenreTags] = useState<string[]>(
    initialSettings.nsfwGenreTags ?? [],
  );
  const [genreTags, setGenreTags] = useState<string[]>(
    initialSettings.nsfwGenreTags ?? [],
  );
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpPasswordSet, setSmtpPasswordSet] = useState(
    initialSettings.smtpPasswordSet ?? false,
  );

  const isDirty = useMemo(() => {
    return (
      siteName.isDirty ||
      publicAppUrl.isDirty ||
      allowedOrigins.isDirty ||
      nsfwKeywords.isDirty ||
      nsfwSymbols.isDirty ||
      sessionDurationDays.isDirty ||
      minPasswordLength.isDirty ||
      maxAvatarBytes.isDirty ||
      defaultMaxLibraryBytes.isDirty ||
      smtpHost.isDirty ||
      smtpPort.isDirty ||
      smtpUser.isDirty ||
      smtpFrom.isDirty ||
      openRegistration.isDirty ||
      maintenanceMode.isDirty ||
      avatarsEnabled.isDirty ||
      allowAvatarUrl.isDirty ||
      smtpSecure.isDirty ||
      smtpPassword.length > 0 ||
      areArraysDifferent(genreTags, initialGenreTags)
    );
  }, [
    siteName.isDirty,
    publicAppUrl.isDirty,
    allowedOrigins.isDirty,
    nsfwKeywords.isDirty,
    nsfwSymbols.isDirty,
    sessionDurationDays.isDirty,
    minPasswordLength.isDirty,
    maxAvatarBytes.isDirty,
    defaultMaxLibraryBytes.isDirty,
    smtpHost.isDirty,
    smtpPort.isDirty,
    smtpUser.isDirty,
    smtpFrom.isDirty,
    openRegistration.isDirty,
    maintenanceMode.isDirty,
    avatarsEnabled.isDirty,
    allowAvatarUrl.isDirty,
    smtpSecure.isDirty,
    smtpPassword,
    genreTags,
    initialGenreTags,
  ]);

  const handleDiscard = useCallback((): void => {
    siteName.reset();
    publicAppUrl.reset();
    allowedOrigins.reset();
    nsfwKeywords.reset();
    nsfwSymbols.reset();
    sessionDurationDays.reset();
    minPasswordLength.reset();
    maxAvatarBytes.reset();
    defaultMaxLibraryBytes.reset();
    smtpHost.reset();
    smtpPort.reset();
    smtpUser.reset();
    smtpFrom.reset();
    openRegistration.reset();
    maintenanceMode.reset();
    avatarsEnabled.reset();
    allowAvatarUrl.reset();
    smtpSecure.reset();
    setSmtpPassword("");
    setGenreTags(initialGenreTags);
    setNotice(null);
    setSuccessNotice(null);
  }, [
    siteName,
    publicAppUrl,
    allowedOrigins,
    nsfwKeywords,
    nsfwSymbols,
    sessionDurationDays,
    minPasswordLength,
    maxAvatarBytes,
    defaultMaxLibraryBytes,
    smtpHost,
    smtpPort,
    smtpUser,
    smtpFrom,
    openRegistration,
    maintenanceMode,
    avatarsEnabled,
    allowAvatarUrl,
    smtpSecure,
    initialGenreTags,
  ]);

  const handleSave = useCallback(async (): Promise<void> => {
    setNotice(null);
    setSuccessNotice(null);

    const siteNameParsed = siteName.parse(siteName.text);
    const publicAppUrlParsed = publicAppUrl.parse(publicAppUrl.text);
    const allowedOriginsParsed = allowedOrigins.parse(allowedOrigins.text);
    const nsfwKeywordsParsed = nsfwKeywords.parse(nsfwKeywords.text);
    const nsfwSymbolsParsed = nsfwSymbols.parse(nsfwSymbols.text);
    const sessionDurationDaysParsed = sessionDurationDays.parse(
      sessionDurationDays.text,
    );
    const minPasswordLengthParsed = minPasswordLength.parse(
      minPasswordLength.text,
    );
    const maxAvatarBytesParsed = maxAvatarBytes.parse(maxAvatarBytes.text);
    const defaultMaxLibraryBytesParsed = defaultMaxLibraryBytes.parse(
      defaultMaxLibraryBytes.text,
    );
    const smtpHostParsed = smtpHost.parse(smtpHost.text);
    const smtpPortParsed = smtpPort.parse(smtpPort.text);
    const smtpUserParsed = smtpUser.parse(smtpUser.text);
    const smtpFromParsed = smtpFrom.parse(smtpFrom.text);

    if (!siteNameParsed) {
      setNotice(t("settings.invalidSiteName"));
      return;
    }
    if (!sessionDurationDaysParsed) {
      setNotice(t("settings.invalidSessionDuration"));
      return;
    }
    if (!minPasswordLengthParsed) {
      setNotice(t("settings.invalidMinPasswordLength"));
      return;
    }
    if (!maxAvatarBytesParsed) {
      setNotice(t("settings.invalidMaxAvatarBytes"));
      return;
    }
    if (!defaultMaxLibraryBytesParsed) {
      setNotice(t("settings.invalidDefaultMaxLibraryBytes"));
      return;
    }
    if (!smtpPortParsed) {
      setNotice(t("settings.invalidSmtpPort"));
      return;
    }
    if (
      publicAppUrlParsed?.value &&
      !/^https?:\/\/.+/.test(publicAppUrlParsed.value)
    ) {
      setNotice(t("settings.invalidPublicAppUrl"));
      return;
    }

    const body: Record<string, unknown> = {
      registrationMode: openRegistration.value ? "OPEN" : "INVITE_ONLY",
      maintenanceMode: maintenanceMode.value,
      siteName: siteNameParsed.value,
      publicAppUrl: publicAppUrlParsed?.value ?? null,
      allowedOrigins: allowedOriginsParsed?.value ?? [],
      nsfwGenreTags: genreTags,
      nsfwKeywords: nsfwKeywordsParsed?.value ?? [],
      nsfwSymbols: nsfwSymbolsParsed?.value ?? [],
      sessionDurationDays: sessionDurationDaysParsed.value,
      minPasswordLength: minPasswordLengthParsed.value,
      avatarsEnabled: avatarsEnabled.value,
      allowAvatarUrl: allowAvatarUrl.value,
      maxAvatarBytes: maxAvatarBytesParsed.value,
      defaultMaxLibraryBytes: defaultMaxLibraryBytesParsed.value,
      smtpHost: smtpHostParsed?.value ?? null,
      smtpPort: smtpPortParsed?.value ?? null,
      smtpSecure: smtpSecure.value,
      smtpUser: smtpUserParsed?.value ?? null,
      smtpFrom: smtpFromParsed?.value ?? null,
    };

    if (smtpPassword.trim()) {
      body.smtpPassword = smtpPassword.trim();
    }

    setSaving(true);
    try {
      const response = await apiFetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        setNotice(
          await extractErrorMessage(
            response,
            t("settings.saveFailedFallback"),
          ),
        );
        return;
      }

      const data: { settings: AdminSettingsInitial & { id?: string } } =
        await response.json();
      const { id: _id, ...updated } = data.settings;

      siteName.setCommitted(updated.siteName);
      publicAppUrl.setCommitted(updated.publicAppUrl);
      allowedOrigins.setCommitted(updated.allowedOrigins ?? []);
      nsfwKeywords.setCommitted(updated.nsfwKeywords ?? []);
      nsfwSymbols.setCommitted(updated.nsfwSymbols ?? []);
      sessionDurationDays.setCommitted(updated.sessionDurationDays);
      minPasswordLength.setCommitted(updated.minPasswordLength);
      maxAvatarBytes.setCommitted(updated.maxAvatarBytes);
      defaultMaxLibraryBytes.setCommitted(updated.defaultMaxLibraryBytes);
      smtpHost.setCommitted(updated.smtpHost);
      smtpPort.setCommitted(updated.smtpPort);
      smtpUser.setCommitted(updated.smtpUser);
      smtpFrom.setCommitted(updated.smtpFrom);

      openRegistration.setInitial(updated.registrationMode === "OPEN");
      maintenanceMode.setInitial(updated.maintenanceMode);
      avatarsEnabled.setInitial(updated.avatarsEnabled);
      allowAvatarUrl.setInitial(updated.allowAvatarUrl);
      smtpSecure.setInitial(updated.smtpSecure);

      setInitialGenreTags(updated.nsfwGenreTags ?? []);
      setGenreTags(updated.nsfwGenreTags ?? []);
      setSmtpPassword("");
      if (updated.smtpPasswordSet !== undefined) {
        setSmtpPasswordSet(updated.smtpPasswordSet);
      }
      setSuccessNotice(t("settings.saveSuccess"));
    } catch {
      setNotice(t("settings.saveFailedFallback"));
    } finally {
      setSaving(false);
    }
  }, [
    t,
    siteName,
    publicAppUrl,
    allowedOrigins,
    nsfwKeywords,
    nsfwSymbols,
    sessionDurationDays,
    minPasswordLength,
    maxAvatarBytes,
    defaultMaxLibraryBytes,
    smtpHost,
    smtpPort,
    smtpUser,
    smtpFrom,
    openRegistration,
    maintenanceMode,
    avatarsEnabled,
    allowAvatarUrl,
    smtpSecure,
    genreTags,
    smtpPassword,
  ]);

  // Ctrl+S / Cmd+S shortcut to save settings
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (isDirty && !saving) {
          void handleSave();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isDirty, saving, handleSave]);

  const tabs = [
    {
      key: "general",
      label: t("settings.groupGeneral"),
      icon: SlidersHorizontal,
    },
    { key: "network", label: t("settings.groupNetwork"), icon: Globe },
    { key: "nsfw", label: t("settings.groupNsfw"), icon: EyeOff },
    {
      key: "security",
      label: t("settings.groupSecurity"),
      icon: ShieldCheck,
    },
    { key: "avatars", label: t("settings.groupAvatars"), icon: ImageIcon },
    { key: "library", label: t("settings.groupLibrary"), icon: Library },
    { key: "email", label: t("settings.groupEmail"), icon: Mail },
  ];

  return (
    <PageShell width="wide">
      <PageHeader
        title={t("tabs.settings")}
        description={t("settings.pageDescription")}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {isDirty && (
              <Badge tone="warning" className="mr-1">
                {t("settings.unsavedChanges")}
              </Badge>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!isDirty || saving}
              onClick={handleDiscard}
            >
              <RotateCcw className="size-3.5" />
              {t("settings.discard")}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!isDirty || saving}
              onClick={handleSave}
            >
              <Save className="size-3.5" />
              {saving ? t("settings.saving") : t("settings.saveChanges")}
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-4">
        {notice && (
          <div className="flex items-center gap-2.5 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <p className="flex-1">{notice}</p>
          </div>
        )}

        {successNotice && (
          <div className="flex items-center gap-2.5 rounded-md border border-success/30 bg-success/10 p-3 text-sm text-success">
            <CheckCircle2 className="size-4 shrink-0" />
            <p className="flex-1">{successNotice}</p>
          </div>
        )}

        <TabLayout
          tabs={tabs}
          active={tab}
          onSelect={setTab}
          label={t("tabs.settings")}
        >
          <div className={tab === "nsfw" ? undefined : "hidden"}>
            <NsfwSection
              keywords={nsfwKeywords}
              symbols={nsfwSymbols}
              genreTags={genreTags}
              onGenreTagsChange={setGenreTags}
              saving={saving}
              setNotice={setNotice}
            />
          </div>

          {tab === "general" && (
            <GeneralSection
              siteName={siteName}
              openRegistration={openRegistration}
              maintenanceMode={maintenanceMode}
              saving={saving}
            />
          )}
          {tab === "network" && (
            <NetworkSection
              publicAppUrl={publicAppUrl}
              allowedOrigins={allowedOrigins}
              saving={saving}
            />
          )}
          {tab === "security" && (
            <SecuritySection
              sessionDurationDays={sessionDurationDays}
              minPasswordLength={minPasswordLength}
              saving={saving}
            />
          )}
          {tab === "avatars" && (
            <AvatarsSection
              avatarsEnabled={avatarsEnabled}
              allowAvatarUrl={allowAvatarUrl}
              maxAvatarBytes={maxAvatarBytes}
              saving={saving}
            />
          )}
          {tab === "library" && (
            <LibrarySection
              defaultMaxLibraryBytes={defaultMaxLibraryBytes}
              saving={saving}
            />
          )}
          {tab === "email" && (
            <EmailSection
              smtpHost={smtpHost}
              smtpPort={smtpPort}
              smtpUser={smtpUser}
              smtpFrom={smtpFrom}
              smtpSecure={smtpSecure}
              smtpPassword={smtpPassword}
              onSmtpPasswordChange={setSmtpPassword}
              passwordSet={smtpPasswordSet}
              saving={saving}
            />
          )}
        </TabLayout>
      </div>
    </PageShell>
  );
}

export default function AdminSettingsPage(): React.ReactElement {
  const t = useTranslations("Admin");
  const [initialSettings, setInitialSettings] =
    useState<AdminSettingsInitial | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/settings")
      .then((response) => (response.ok ? response.json() : null))
      .then(
        (data: { settings: AdminSettingsInitial & { id: string } } | null) => {
          if (cancelled || !data) return;
          const { id: _id, ...settings } = data.settings;
          setInitialSettings(settings);
        },
      );
    return () => {
      cancelled = true;
    };
  }, []);

  if (initialSettings === null) {
    return (
      <PageShell width="wide">
        <PageHeader
          title={t("tabs.settings")}
          description={t("settings.pageDescription")}
        />
        <div
          role="status"
          aria-busy="true"
          aria-label={t("settings.loading")}
          className="flex flex-col gap-6 lg:flex-row lg:gap-8"
        >
          <div className="hidden lg:flex lg:w-56 lg:shrink-0 lg:flex-col lg:gap-1">
            {Array.from({ length: 7 }, (_, index) => (
              <Skeleton key={index} className="h-9 w-full" />
            ))}
          </div>
          <div className="min-w-0 flex-1">
            <Card className="gap-0">
              <CardHeader className="border-b">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="mt-2 h-4 w-64" />
              </CardHeader>
              <CardContent className="divide-y px-0">
                {Array.from({ length: 4 }, (_, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-4 px-(--card-spacing) py-3"
                  >
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3.5 w-56" />
                    </div>
                    <Skeleton className="h-8 w-40 shrink-0 rounded-lg" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </PageShell>
    );
  }

  return <SettingsForm initialSettings={initialSettings} />;
}
