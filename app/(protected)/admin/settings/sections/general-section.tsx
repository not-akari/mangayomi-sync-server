"use client";

import { useTranslations } from "next-intl";
import { SettingsGroup } from "@/components/layout/setting-group";
import { SwitchSettingRow, TextSettingRow } from "../setting-inputs";
import type { SettingField, SettingToggle } from "@/hooks/use-setting-field";

export function GeneralSection({
  siteName,
  openRegistration,
  maintenanceMode,
  saving,
}: {
  siteName: SettingField<string | null>;
  openRegistration: SettingToggle;
  maintenanceMode: SettingToggle;
  saving: boolean;
}): React.ReactElement {
  const t = useTranslations("Admin");

  return (
    <SettingsGroup>
      <TextSettingRow
        id="site-name"
        label={t("settings.siteName")}
        description={t("settings.siteNameDescription")}
        field={siteName}
        disabled={saving}
        className="w-full sm:w-72"
        placeholder="Mangayomi"
      />
      <SwitchSettingRow
        id="open-registration"
        label={t("settings.openRegistration")}
        description={t("settings.openRegistrationDescription")}
        toggle={openRegistration}
        disabled={saving}
      />
      <SwitchSettingRow
        id="maintenance-mode"
        label={t("settings.maintenanceMode")}
        description={t("settings.maintenanceModeDescription")}
        toggle={maintenanceMode}
        disabled={saving}
      />
    </SettingsGroup>
  );
}
