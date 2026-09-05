"use client";

import { useTranslations } from "next-intl";
import { SettingsGroup } from "@/components/layout/setting-group";
import { TextSettingRow } from "../setting-inputs";
import type { SettingField } from "@/hooks/use-setting-field";

export function NetworkSection({
  publicAppUrl,
  allowedOrigins,
  saving,
}: {
  publicAppUrl: SettingField<string | null>;
  allowedOrigins: SettingField<string[]>;
  saving: boolean;
}): React.ReactElement {
  const t = useTranslations("Admin");

  return (
    <SettingsGroup>
      <TextSettingRow
        id="public-app-url"
        label={t("settings.publicAppUrl")}
        description={t("settings.publicAppUrlDescription")}
        field={publicAppUrl}
        disabled={saving}
        className="w-full sm:w-80"
        placeholder="https://sync.example.com"
      />
      <TextSettingRow
        id="allowed-origins"
        label={t("settings.allowedOrigins")}
        description={t("settings.allowedOriginsDescription")}
        field={allowedOrigins}
        disabled={saving}
        className="w-full sm:w-80"
        placeholder="https://app.example.com"
      />
    </SettingsGroup>
  );
}
