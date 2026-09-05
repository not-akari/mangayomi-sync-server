"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/ui/form-error";
import { AuthHero } from "@/components/layout/auth-hero";
import { extractErrorMessage } from "@/lib/api/api-error-client";
import { completeAuth } from "@/lib/auth/complete-auth";
import { USERNAME_LENGTH, PASSWORD_LENGTH } from "@/lib/config";

const MIN_USERNAME_LENGTH = USERNAME_LENGTH.min;
const MIN_PASSWORD_LENGTH = PASSWORD_LENGTH.min;

export function SetupForm(): React.ReactElement {
  const router = useRouter();
  const t = useTranslations("Setup");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [touched, setTouched] = useState({
    username: false,
    password: false,
    confirmPassword: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const usernameInvalid =
    touched.username && username.length < MIN_USERNAME_LENGTH;
  const passwordInvalid =
    touched.password && password.length < MIN_PASSWORD_LENGTH;
  const confirmPasswordInvalid =
    touched.confirmPassword && confirmPassword !== password;
  const canSubmit =
    username.length >= MIN_USERNAME_LENGTH &&
    password.length >= MIN_PASSWORD_LENGTH &&
    confirmPassword === password;

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: username.trim(), password }),
      });
      if (!response.ok) {
        setError(await extractErrorMessage(response, t("failedFallback")));
        return;
      }
      completeAuth("/admin/settings", router);
    } catch {
      setError(t("failedFallback"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-10 px-6 py-12 lg:flex-row lg:items-center lg:justify-between lg:gap-16">
      <AuthHero title={t("title")} description={t("description")} />

      <Card className="w-full max-w-sm shrink-0">
        <CardContent>
          <form
            method="post"
            onSubmit={handleSubmit}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="username">{t("username")}</Label>
              <Input
                id="username"
                name="username"
                autoFocus
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, username: true }))}
                aria-invalid={usernameInvalid}
              />
              {usernameInvalid && (
                <FormError
                  message={t("usernameError", { min: MIN_USERNAME_LENGTH })}
                />
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">{t("password")}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                aria-invalid={passwordInvalid}
              />
              {passwordInvalid && (
                <FormError
                  message={t("passwordError", { min: MIN_PASSWORD_LENGTH })}
                />
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirm-password">{t("confirmPassword")}</Label>
              <Input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                onBlur={() =>
                  setTouched((t) => ({ ...t, confirmPassword: true }))
                }
                aria-invalid={confirmPasswordInvalid}
              />
              {confirmPasswordInvalid && (
                <FormError message={t("confirmPasswordError")} />
              )}
            </div>

            {error && <FormError message={error} />}

            <Button type="submit" disabled={submitting || !canSubmit}>
              {t("createAdmin")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
