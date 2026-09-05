"use client";

import { useTranslations } from "next-intl";
import { SettingsGroup } from "@/components/layout/setting-group";
import { SwitchSettingRow, TextSettingRow } from "../setting-inputs";
import type { SettingField, SettingToggle } from "@/hooks/use-setting-field";

export function AvatarsSection({
  avatarsEnabled,
  allowAvatarUrl,
  maxAvatarBytes,
  saving,
}: {
  avatarsEnabled: SettingToggle;
  allowAvatarUrl: SettingToggle;
  maxAvatarBytes: SettingField<number>;
  saving: boolean;
}): React.ReactElement {
  const t = useTranslations("Admin");

  return (
    <SettingsGroup>
      <SwitchSettingRow
        id="avatars-enabled"
        label={t("settings.avatarsEnabled")}
        description={t("settings.avatarsEnabledDescription")}
        toggle={avatarsEnabled}
        disabled={saving}
      />
      {avatarsEnabled.value && (
        <>
          <TextSettingRow
            id="max-avatar-mb"
            label={t("settings.maxAvatarSize")}
            description={t("settings.maxAvatarSizeDescription")}
            field={maxAvatarBytes}
            disabled={saving}
            type="number"
            min={0.1}
            step={0.1}
            className="w-full sm:w-24"
          />
          <SwitchSettingRow
            id="allow-avatar-url"
            label={t("settings.allowAvatarUrl")}
            description={t("settings.allowAvatarUrlDescription")}
            toggle={allowAvatarUrl}
            disabled={saving}
          />
        </>
      )}
    </SettingsGroup>
  );
}
