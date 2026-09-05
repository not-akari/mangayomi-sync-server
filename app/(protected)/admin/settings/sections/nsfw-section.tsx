"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { SettingsGroup } from "@/components/layout/setting-group";
import { TextSettingRow } from "../setting-inputs";
import { NsfwTagsField } from "../nsfw-tags-field";
import { commaList } from "@/lib/settings/setting-parsers";
import { downloadNsfwConfig, readNsfwConfigFile } from "@/lib/moderation/nsfw-config";
import type { SettingField } from "@/hooks/use-setting-field";

export function NsfwSection({
  keywords,
  symbols,
  genreTags,
  onGenreTagsChange,
  saving,
  setNotice,
}: {
  keywords: SettingField<string[]>;
  symbols: SettingField<string[]>;
  genreTags: string[];
  onGenreTagsChange: (tags: string[]) => void;
  saving: boolean;
  setNotice: (message: string | null) => void;
}): React.ReactElement {
  const t = useTranslations("Admin");
  const importInputRef = useRef<HTMLInputElement>(null);

  function handleExport(): void {
    const currentKeywords =
      keywords.parse(keywords.text)?.value ?? keywords.committed;
    const currentSymbols =
      symbols.parse(symbols.text)?.value ?? symbols.committed;
    downloadNsfwConfig({
      nsfwGenreTags: genreTags,
      nsfwKeywords: currentKeywords,
      nsfwSymbols: currentSymbols,
    });
  }

  async function handleImport(file: File): Promise<void> {
    setNotice(null);
    const config = await readNsfwConfigFile(file);
    if (!config) {
      setNotice(t("settings.nsfwImportInvalid"));
      return;
    }
    onGenreTagsChange(config.nsfwGenreTags);
    keywords.setText(commaList.format(config.nsfwKeywords));
    symbols.setText(commaList.format(config.nsfwSymbols));
  }

  return (
    <SettingsGroup
      action={
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleExport}
          >
            {t("settings.nsfwExport")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => importInputRef.current?.click()}
          >
            {t("settings.nsfwImport")}
          </Button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleImport(file);
              event.target.value = "";
            }}
          />
        </div>
      }
    >
      <NsfwTagsField
        selected={genreTags}
        onSelectedChange={onGenreTagsChange}
        disabled={saving}
      />
      <TextSettingRow
        id="nsfw-keywords"
        label={t("settings.nsfwKeywords")}
        description={t("settings.nsfwKeywordsDescription")}
        layout="column"
        field={keywords}
        disabled={saving}
      />
      <TextSettingRow
        id="nsfw-symbols"
        label={t("settings.nsfwSymbols")}
        description={t("settings.nsfwSymbolsDescription")}
        layout="column"
        field={symbols}
        disabled={saving}
      />
    </SettingsGroup>
  );
}
