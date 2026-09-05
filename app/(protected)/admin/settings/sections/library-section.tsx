"use client";

import { useTranslations } from "next-intl";
import { SettingsGroup } from "@/components/layout/setting-group";
import { TextSettingRow } from "../setting-inputs";
import type { SettingField } from "@/hooks/use-setting-field";

export function LibrarySection({
  defaultMaxLibraryBytes,
  saving,
}: {
  defaultMaxLibraryBytes: SettingField<number | null>;
  saving: boolean;
}): React.ReactElement {
  const t = useTranslations("Admin");

  return (
    <SettingsGroup>
      <TextSettingRow
        id="max-library-mb"
        label={t("settings.defaultMaxLibraryBytes")}
        description={t("settings.defaultMaxLibraryBytesDescription")}
        field={defaultMaxLibraryBytes}
        disabled={saving}
        type="number"
        min={1}
        step={1}
        className="w-full sm:w-40"
        placeholder={t("settings.unlimited")}
      />
    </SettingsGroup>
  );
}
