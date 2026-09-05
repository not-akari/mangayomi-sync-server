"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { apiFetch } from "@/lib/auth/csrf-client";
import { extractErrorMessage } from "@/lib/api/api-error-client";

const LOCKED_OUT_SUBJECT = "Locked out of my account";

function EmailResetForm(): React.ReactElement {
  const t = useTranslations("ForgotPassword");
  const [username, setUsername] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
    } finally {
      // Shown regardless of outcome, see the API route for why.
      setSubmitted(true);
      setSubmitting(false);
    }
  }

  return (
    <form method="post" onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="forgot-username">{t("usernameLabel")}</Label>
        <Input
          id="forgot-username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
          disabled={submitting}
        />
      </div>
      <Button type="submit" disabled={submitting || !username}>
        {t("sendLink")}
      </Button>
      {submitted && (
        <p className="text-sm text-muted-foreground">{t("genericMessage")}</p>
      )}
    </form>
  );
}

function LockedOutForm(): React.ReactElement {
  const t = useTranslations("ForgotPassword");
  const [expanded, setExpanded] = useState(false);
  const [contactUsername, setContactUsername] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await apiFetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: LOCKED_OUT_SUBJECT,
          message,
          contactUsername,
          contactInfo: contactInfo.trim() || undefined,
        }),
      });
      if (!response.ok) {
        setError(
          await extractErrorMessage(response, t("lockedOutFailedFallback")),
        );
        return;
      }
      setSubmitted(true);
    } catch {
      setError(t("lockedOutFailedFallback"));
    } finally {
      setSubmitting(false);
    }
  }

  if (!expanded) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full text-muted-foreground hover:text-foreground"
        onClick={() => setExpanded(true)}
      >
        {t("lockedOutToggle")}
      </Button>
    );
  }

  if (submitted) {
    return (
      <p className="text-sm text-muted-foreground">{t("lockedOutSubmitted")}</p>
    );
  }

  return (
    <form method="post" onSubmit={handleSubmit} className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {t("lockedOutDescription")}
      </p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="locked-out-username">{t("usernameLabel")}</Label>
        <Input
          id="locked-out-username"
          value={contactUsername}
          onChange={(event) => setContactUsername(event.target.value)}
          required
          disabled={submitting}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="locked-out-contact">{t("contactInfoLabel")}</Label>
        <Input
          id="locked-out-contact"
          value={contactInfo}
          onChange={(event) => setContactInfo(event.target.value)}
          placeholder={t("contactInfoPlaceholder")}
          disabled={submitting}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="locked-out-message">{t("messageLabel")}</Label>
        <Textarea
          id="locked-out-message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          required
          disabled={submitting}
          rows={3}
        />
      </div>
      <Button
        type="submit"
        variant="secondary"
        className="w-fit"
        disabled={submitting}
      >
        {t("lockedOutSubmit")}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}

export function ForgotPasswordForm({
  emailConfigured,
}: {
  emailConfigured: boolean;
}): React.ReactElement {
  const t = useTranslations("ForgotPassword");

  return (
    <main className="flex flex-1 items-center justify-center px-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>
            {emailConfigured ? t("description") : t("descriptionNoEmail")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {emailConfigured && (
            <>
              <EmailResetForm />
              <Separator />
            </>
          )}
          <LockedOutForm />
        </CardContent>
      </Card>
    </main>
  );
}
