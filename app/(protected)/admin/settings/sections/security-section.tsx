"use client";

import { useTranslations } from "next-intl";
import { SettingsGroup } from "@/components/layout/setting-group";
import { TextSettingRow } from "../setting-inputs";
import type { SettingField } from "@/hooks/use-setting-field";

export function SecuritySection({
  sessionDurationDays,
  minPasswordLength,
  saving,
}: {
  sessionDurationDays: SettingField<number>;
  minPasswordLength: SettingField<number>;
  saving: boolean;
}): React.ReactElement {
  const t = useTranslations("Admin");

  return (
    <SettingsGroup>
      <TextSettingRow
        id="session-duration"
        label={t("settings.sessionDuration")}
        description={t("settings.sessionDurationDescription")}
        field={sessionDurationDays}
        disabled={saving}
        type="number"
        min={1}
        max={365}
        className="w-full sm:w-24"
      />
      <TextSettingRow
        id="min-password-length"
        label={t("settings.minPasswordLength")}
        description={t("settings.minPasswordLengthDescription")}
        field={minPasswordLength}
        disabled={saving}
        type="number"
        min={1}
        className="w-full sm:w-24"
      />
    </SettingsGroup>
  );
}
