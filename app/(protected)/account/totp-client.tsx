"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/auth/csrf-client";
import { extractErrorMessage } from "@/lib/api/api-error-client";

type Step = "idle" | "confirming" | "recoveryCodes";

export function TotpClient({
  initialEnabled,
}: {
  initialEnabled: boolean;
}): React.ReactElement {
  const router = useRouter();
  const t = useTranslations("Account");
  const [enabled, setEnabled] = useState(initialEnabled);
  const [step, setStep] = useState<Step>("idle");
  const [secret, setSecret] = useState("");
  const [uri, setUri] = useState("");
  const [qrSvg, setQrSvg] = useState("");
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [disablePassword, setDisablePassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function startSetup(): Promise<void> {
    setError(null);
    setSubmitting(true);
    try {
      const response = await apiFetch("/api/account/totp/setup", {
        method: "POST",
      });
      if (!response.ok) {
        setError(await extractErrorMessage(response, t("totpSetupFailed")));
        return;
      }
      const body = (await response.json()) as {
        secret: string;
        uri: string;
        qrSvg: string;
      };
      setSecret(body.secret);
      setUri(body.uri);
      setQrSvg(body.qrSvg);
      setStep("confirming");
    } catch {
      setError(t("totpSetupFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmSetup(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await apiFetch("/api/account/totp/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, code }),
      });
      if (!response.ok) {
        setError(await extractErrorMessage(response, t("totpSetupFailed")));
        return;
      }
      const body = (await response.json()) as { recoveryCodes: string[] };
      setRecoveryCodes(body.recoveryCodes);
      setStep("recoveryCodes");
      setEnabled(true);
      router.refresh();
    } catch {
      setError(t("totpSetupFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  async function disable(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await apiFetch("/api/account/totp/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: disablePassword }),
      });
      if (!response.ok) {
        setError(await extractErrorMessage(response, t("totpDisableFailed")));
        return;
      }
      setDisablePassword("");
      setEnabled(false);
      setStep("idle");
      router.refresh();
    } catch {
      setError(t("totpDisableFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "recoveryCodes") {
    return (
      <div className="flex max-w-sm flex-col gap-3">
        <p className="text-sm font-medium">{t("totpRecoveryCodesTitle")}</p>
        <p className="text-sm text-muted-foreground">
          {t("totpRecoveryCodesHint")}
        </p>
        <ul className="grid grid-cols-2 gap-2 rounded-md border p-3 font-mono text-sm">
          {recoveryCodes.map((rc) => (
            <li key={rc}>{rc}</li>
          ))}
        </ul>
        <Button
          type="button"
          className="w-fit"
          onClick={() => {
            setStep("idle");
            setSecret("");
            setUri("");
            setCode("");
          }}
        >
          {t("totpDone")}
        </Button>
      </div>
    );
  }

  if (step === "confirming") {
    return (
      <form
        method="post"
        onSubmit={confirmSetup}
        className="flex max-w-sm flex-col gap-3"
      >
        <p className="text-sm text-muted-foreground">{t("totpScanHint")}</p>
        {qrSvg && (
          <div
            className="h-48 w-48 self-center rounded-md border bg-white p-2 [&_svg]:h-full [&_svg]:w-full"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
        )}
        <p className="text-xs text-muted-foreground">{t("totpManualEntry")}</p>
        <p className="break-all rounded-md border p-2 font-mono text-sm">
          {secret}
        </p>
        <a
          href={uri}
          className="w-fit text-xs text-muted-foreground hover:underline"
        >
          {t("totpOpenInApp")}
        </a>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="totp-confirm-code">{t("totpCodeLabel")}</Label>
          <Input
            id="totp-confirm-code"
            autoFocus
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={submitting}>
            {t("totpConfirmEnable")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setStep("idle");
              setError(null);
            }}
          >
            {t("totpCancel")}
          </Button>
        </div>
      </form>
    );
  }

  if (enabled) {
    return (
      <form
        method="post"
        onSubmit={disable}
        className="flex max-w-sm flex-col gap-3"
      >
        <p className="text-sm text-muted-foreground">{t("totpEnabledHint")}</p>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="totp-disable-password">{t("currentPassword")}</Label>
          <Input
            id="totp-disable-password"
            type="password"
            autoComplete="current-password"
            value={disablePassword}
            onChange={(event) => setDisablePassword(event.target.value)}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          type="submit"
          variant="secondary"
          className="w-fit"
          disabled={submitting}
        >
          {t("totpDisable")}
        </Button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">{t("totpDisabledHint")}</p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button
        type="button"
        className="w-fit"
        onClick={startSetup}
        disabled={submitting}
      >
        {t("totpEnable")}
      </Button>
    </div>
  );
}
