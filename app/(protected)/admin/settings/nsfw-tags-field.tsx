"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { SettingRow } from "@/components/layout/setting-group";
import { cn } from "@/lib/utils";

export function NsfwTagsField({
  selected,
  onSelectedChange,
  disabled = false,
}: {
  selected: string[];
  onSelectedChange: (next: string[]) => void;
  disabled?: boolean;
}): React.ReactElement {
  const t = useTranslations("Admin");
  const [allTags, setAllTags] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/genre-tags")
      .then((response) => {
        if (!response.ok) throw new Error(`Request failed: ${response.status}`);
        return response.json() as Promise<{ tags: string[] }>;
      })
      .then((data) => {
        if (!cancelled) setAllTags(data.tags);
      })
      .catch(() => {
        if (!cancelled) setAllTags([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  function toggle(tag: string): void {
    const next = new Set(selectedSet);
    if (next.has(tag)) next.delete(tag);
    else next.add(tag);
    onSelectedChange(Array.from(next));
  }

  const visibleTags = allTags.filter((tag) =>
    tag.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <SettingRow
      htmlFor="nsfw-tag-search"
      label={t("settings.nsfwGenreTags")}
      description={t("settings.nsfwGenreTagsDescription")}
      layout="column"
    >
      <Input
        id="nsfw-tag-search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={t("settings.nsfwGenreTagsSearch")}
        disabled={disabled}
      />
      {visibleTags.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("settings.nsfwGenreTagsEmpty")}
        </p>
      ) : (
        <div className="thin-scrollbar flex max-h-64 flex-wrap gap-1.5 overflow-y-auto">
          {visibleTags.map((tag) => {
            const active = selectedSet.has(tag);
            return (
              <button
                key={tag}
                type="button"
                disabled={disabled}
                onClick={() => toggle(tag)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs transition-colors disabled:opacity-50",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                )}
              >
                {tag}
              </button>
            );
          })}
        </div>
      )}
    </SettingRow>
  );
}
