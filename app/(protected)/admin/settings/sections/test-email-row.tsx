"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/auth/csrf-client";
import { extractErrorMessage } from "@/lib/api/api-error-client";
import { SettingRow } from "@/components/layout/setting-group";

export function TestEmailRow(): React.ReactElement {
  const t = useTranslations("Admin");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState<
    "idle" | "sending" | "success" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  async function send(): Promise<void> {
    setStatus("sending");
    setError(null);
    try {
      const response = await apiFetch("/api/admin/settings/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to }),
      });
      if (!response.ok) {
        setError(
          await extractErrorMessage(
            response,
            t("settings.testEmailFailedFallback"),
          ),
        );
        setStatus("error");
        return;
      }
      setStatus("success");
    } catch {
      setError(t("settings.testEmailFailedFallback"));
      setStatus("error");
    }
  }

  return (
    <SettingRow
      htmlFor="test-email-to"
      label={t("settings.testEmail")}
      description={t("settings.testEmailDescription")}
      layout="column"
    >
      <div className="flex gap-2">
        <Input
          id="test-email-to"
          type="email"
          placeholder="you@example.com"
          value={to}
          disabled={status === "sending"}
          onChange={(event) => {
            setTo(event.target.value);
            setStatus("idle");
          }}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={status === "sending" || !to}
          onClick={send}
        >
          {t("settings.testEmailSend")}
        </Button>
      </div>
      {status === "success" && (
        <p className="text-sm text-muted-foreground">
          {t("settings.testEmailSuccess")}
        </p>
      )}
      {status === "error" && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </SettingRow>
  );
}
