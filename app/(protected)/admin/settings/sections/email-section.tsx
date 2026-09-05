"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { SettingRow, SettingsGroup } from "@/components/layout/setting-group";
import { SwitchSettingRow, TextSettingRow } from "../setting-inputs";
import { TestEmailRow } from "./test-email-row";
import type { SettingField, SettingToggle } from "@/hooks/use-setting-field";

export function EmailSection({
  smtpHost,
  smtpPort,
  smtpUser,
  smtpFrom,
  smtpSecure,
  smtpPassword,
  onSmtpPasswordChange,
  passwordSet,
  saving,
}: {
  smtpHost: SettingField<string | null>;
  smtpPort: SettingField<number | null>;
  smtpUser: SettingField<string | null>;
  smtpFrom: SettingField<string | null>;
  smtpSecure: SettingToggle;
  smtpPassword: string;
  onSmtpPasswordChange: (value: string) => void;
  passwordSet: boolean;
  saving: boolean;
}): React.ReactElement {
  const t = useTranslations("Admin");

  return (
    <SettingsGroup>
      <TextSettingRow
        id="smtp-host"
        label={t("settings.smtpHost")}
        field={smtpHost}
        disabled={saving}
        className="w-full sm:w-72"
        placeholder="smtp.example.com"
      />
      <TextSettingRow
        id="smtp-port"
        label={t("settings.smtpPort")}
        field={smtpPort}
        disabled={saving}
        type="number"
        min={1}
        max={65535}
        className="w-full sm:w-28"
        placeholder="587"
      />
      <SwitchSettingRow
        id="smtp-secure"
        label={t("settings.smtpSecure")}
        description={t("settings.smtpSecureDescription")}
        toggle={smtpSecure}
        disabled={saving}
      />
      <TextSettingRow
        id="smtp-user"
        label={t("settings.smtpUser")}
        field={smtpUser}
        disabled={saving}
        className="w-full sm:w-72"
      />

      <SettingRow htmlFor="smtp-password" label={t("settings.smtpPassword")}>
        <Input
          id="smtp-password"
          type="password"
          autoComplete="off"
          className="w-full sm:w-72"
          placeholder={
            passwordSet ? t("settings.smtpPasswordSetPlaceholder") : ""
          }
          value={smtpPassword}
          disabled={saving}
          onChange={(event) => onSmtpPasswordChange(event.target.value)}
        />
      </SettingRow>

      <TextSettingRow
        id="smtp-from"
        label={t("settings.smtpFrom")}
        description={t("settings.smtpFromDescription")}
        field={smtpFrom}
        disabled={saving}
        className="w-full sm:w-72"
        placeholder="no-reply@example.com"
      />

      {Boolean(smtpHost.text.trim() || smtpHost.committed) && <TestEmailRow />}
    </SettingsGroup>
  );
}
