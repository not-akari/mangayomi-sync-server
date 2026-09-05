"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/auth/csrf-client";
import { extractErrorMessage } from "@/lib/api/api-error-client";
import { Save, RotateCcw, CheckCircle2, AlertCircle } from "lucide-react";

export function NsfwClient({
  initialBlurNsfw,
}: {
  initialBlurNsfw: boolean;
}): React.ReactElement {
  const t = useTranslations("Account");
  const [committed, setCommitted] = useState(Boolean(initialBlurNsfw));
  const [blurNsfw, setBlurNsfw] = useState(Boolean(initialBlurNsfw));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty = blurNsfw !== committed;

  const handleSave = useCallback(async (): Promise<void> => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const response = await apiFetch("/api/account/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blurNsfw }),
      });
      if (!response.ok) {
        setError(
          await extractErrorMessage(
            response,
            t("preferencesFailedFallback"),
          ),
        );
        return;
      }
      setCommitted(blurNsfw);
      setSaved(true);
    } catch {
      setError(t("preferencesFailedFallback"));
    } finally {
      setSaving(false);
    }
  }, [blurNsfw, t]);

  const handleDiscard = useCallback((): void => {
    setBlurNsfw(committed);
    setError(null);
    setSaved(false);
  }, [committed]);

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

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="flex items-center gap-2.5 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <p className="flex-1">{error}</p>
        </div>
      )}

      {saved && (
        <div className="flex items-center gap-2.5 rounded-md border border-success/30 bg-success/10 p-3 text-sm text-success">
          <CheckCircle2 className="size-4 shrink-0" />
          <p className="flex-1">{t("preferencesSaved")}</p>
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Label htmlFor="blur-nsfw">{t("blurNsfwLabel")}</Label>
            {isDirty && (
              <Badge tone="warning" className="text-[10px]">
                {t("unsavedChanges")}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {t("blurNsfwDescription")}
          </p>
        </div>
        <Switch
          id="blur-nsfw"
          checked={blurNsfw}
          onCheckedChange={(checked) => {
            setBlurNsfw(checked);
            setSaved(false);
            setError(null);
          }}
          disabled={saving}
        />
      </div>

      <div className="flex items-center justify-end gap-2 border-t pt-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!isDirty || saving}
          onClick={handleDiscard}
        >
          <RotateCcw className="size-3.5" />
          {t("preferencesDiscard")}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!isDirty || saving}
          onClick={handleSave}
        >
          <Save className="size-3.5" />
          {saving ? t("preferencesSaving") : t("preferencesSave")}
        </Button>
      </div>
    </div>
  );
}
