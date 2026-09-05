"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/auth/csrf-client";
import { extractErrorMessage } from "@/lib/api/api-error-client";
import { Save, RotateCcw, CheckCircle2, AlertCircle } from "lucide-react";

export function EmailClient({
  initialEmail,
}: {
  initialEmail: string | null;
}): React.ReactElement {
  const t = useTranslations("Account");
  const [committed, setCommitted] = useState(initialEmail ?? "");
  const [expanded, setExpanded] = useState(initialEmail !== null);
  const [email, setEmail] = useState(initialEmail ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isDirty = email !== committed;

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setSubmitting(true);
    try {
      const response = await apiFetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() || null }),
      });
      if (!response.ok) {
        setError(
          await extractErrorMessage(response, t("emailUpdateFailedFallback")),
        );
        return;
      }
      setCommitted(email.trim());
      setSaved(true);
    } catch {
      setError(t("emailUpdateFailedFallback"));
    } finally {
      setSubmitting(false);
    }
  }

  function handleDiscard(): void {
    setEmail(committed);
    setError(null);
    setSaved(false);
  }

  if (!expanded) {
    return (
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setExpanded(true)}
      >
        {t("emailToggle")}
      </Button>
    );
  }

  return (
    <form
      method="post"
      onSubmit={handleSubmit}
      className="flex max-w-sm flex-col gap-3"
    >
      <p className="text-sm text-muted-foreground">{t("emailDescription")}</p>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <p className="flex-1">{error}</p>
        </div>
      )}

      {saved && (
        <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success/10 p-2.5 text-sm text-success">
          <CheckCircle2 className="size-4 shrink-0" />
          <p className="flex-1">{t("emailSaved")}</p>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Input
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setSaved(false);
            setError(null);
          }}
          placeholder={t("emailPlaceholder")}
          disabled={submitting}
        />
        <Button
          type="submit"
          size="sm"
          disabled={!isDirty || submitting}
        >
          <Save className="size-3.5" />
          {submitting ? t("preferencesSaving") : t("emailSave")}
        </Button>
        {isDirty && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={submitting}
            onClick={handleDiscard}
          >
            <RotateCcw className="size-3.5" />
          </Button>
        )}
      </div>
    </form>
  );
}
