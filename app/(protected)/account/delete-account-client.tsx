"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/auth/csrf-client";
import { extractErrorMessage } from "@/lib/api/api-error-client";

export function DeleteAccountClient(): React.ReactElement {
  const router = useRouter();
  const t = useTranslations("Account");
  const [password, setPassword] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await apiFetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        setError(
          await extractErrorMessage(response, t("deleteFailedFallback")),
        );
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError(t("deleteFailedFallback"));
    } finally {
      setSubmitting(false);
    }
  }

  if (!confirming) {
    return (
      <Button variant="destructive" onClick={() => setConfirming(true)}>
        {t("deleteButton")}
      </Button>
    );
  }

  return (
    <form
      method="post"
      onSubmit={handleSubmit}
      className="flex max-w-sm flex-col gap-3"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="delete-password">{t("deletePassword")}</Label>
        <Input
          id="delete-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" variant="destructive" disabled={submitting}>
        {t("deleteButton")}
      </Button>
    </form>
  );
}
