"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FormError } from "@/components/ui/form-error";
import { AuthHero } from "@/components/layout/auth-hero";
import { extractErrorMessage } from "@/lib/api/api-error-client";
import { apiFetch } from "@/lib/auth/csrf-client";
import { completeAuth } from "@/lib/auth/complete-auth";
import { cn } from "@/lib/utils";
import { USERNAME_LENGTH, PASSWORD_LENGTH } from "@/lib/config";

type Mode = "login" | "register";

const MIN_USERNAME_LENGTH = USERNAME_LENGTH.min;
const MIN_PASSWORD_LENGTH = PASSWORD_LENGTH.min;

// Hint text stays neutral until a field is touched and invalid - red text on an untouched form reads as "already broken".
export function LoginForm({ next }: { next: string }): React.ReactElement {
  const router = useRouter();
  const t = useTranslations("LoginForm");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [stayLoggedIn, setStayLoggedIn] = useState(false);
  // Username and password are shared across both modes, so switching tabs keeps what was typed.
  const [mode, setMode] = useState<Mode>("login");
  const [touched, setTouched] = useState({ username: false, password: false });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");

  useEffect(() => {
    // Not every browser implements this (feature-detected above); the catch avoids unhandled-rejection noise if it isn't.
    navigator.credentials?.preventSilentAccess?.().catch(() => undefined);
  }, []);

  const usernameInvalid =
    touched.username && username.length < MIN_USERNAME_LENGTH;
  const passwordInvalid =
    touched.password && password.length < MIN_PASSWORD_LENGTH;

  async function handleLogin(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: username.trim(),
          password,
          stayLoggedIn,
        }),
      });
      if (!response.ok) {
        setError(await extractErrorMessage(response, t("loginFailedFallback")));
        return;
      }
      const body = (await response.json()) as {
        requiresTotp?: boolean;
        pendingToken?: string;
      };
      if (body.requiresTotp && body.pendingToken) {
        setPendingToken(body.pendingToken);
        return;
      }
      completeAuth(next, router);
    } catch {
      setError(t("loginFailedFallback"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTotpVerify(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await apiFetch("/api/login/totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingToken, code: totpCode }),
      });
      if (!response.ok) {
        setError(await extractErrorMessage(response, t("totpFailedFallback")));
        return;
      }
      completeAuth(next, router);
    } catch {
      setError(t("totpFailedFallback"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: username.trim(),
          password,
          // Omitted rather than sent as "" when blank - an empty string fails validation differently than "not provided".
          ...(inviteCode ? { inviteCode } : {}),
        }),
      });
      if (!response.ok) {
        setError(
          await extractErrorMessage(response, t("registrationFailedFallback")),
        );
        return;
      }
      completeAuth(next, router);
    } catch {
      setError(t("registrationFailedFallback"));
    } finally {
      setSubmitting(false);
    }
  }

  if (pendingToken) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <Card className="w-full max-w-sm">
          <CardContent>
            <form
              method="post"
              onSubmit={handleTotpVerify}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-1.5">
                <h1 className="text-xl font-bold">{t("totpTitle")}</h1>
                <p className="text-sm text-muted-foreground">
                  {t("totpSubtitle")}
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="totp-code">{t("totpCode")}</Label>
                <Input
                  id="totp-code"
                  name="totp-code"
                  autoFocus
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  className="code text-center text-lg"
                  value={totpCode}
                  onChange={(event) => setTotpCode(event.target.value)}
                />
              </div>

              {error && <FormError message={error} />}

              <Button type="submit" disabled={submitting}>
                {t("totpVerify")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setPendingToken(null);
                  setTotpCode("");
                  setError(null);
                }}
              >
                {t("totpBack")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    );
  }

  const isLogin = mode === "login";

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-10 px-6 py-12 lg:flex-row lg:items-center lg:justify-between lg:gap-16">
      <AuthHero title={t("heroTitle")} description={t("heroDescription")} />

      <Card className="w-full max-w-sm shrink-0">
        <CardContent className="flex flex-col gap-5">
          <div
            role="tablist"
            aria-label={t("heroTitle")}
            className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1"
          >
            {(["login", "register"] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={mode === value}
                onClick={() => {
                  setMode(value);
                  setError(null);
                }}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  mode === value
                    ? "bg-background font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {value === "login" ? t("tabLogin") : t("tabRegister")}
              </button>
            ))}
          </div>

          <form
            method="post"
            onSubmit={isLogin ? handleLogin : handleRegister}
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
                autoComplete={isLogin ? "current-password" : "new-password"}
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
              {isLogin && (
                <Link
                  href="/forgot-password"
                  className="w-fit text-xs text-muted-foreground hover:underline"
                >
                  {t("forgotPassword")}
                </Link>
              )}
            </div>

            {isLogin ? (
              <div className="flex items-center gap-2">
                <Switch
                  id="stay-logged-in"
                  checked={stayLoggedIn}
                  onCheckedChange={setStayLoggedIn}
                />
                <Label htmlFor="stay-logged-in">{t("stayLoggedIn")}</Label>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="invite-code">{t("inviteCode")}</Label>
                <Input
                  id="invite-code"
                  name="invite-code"
                  autoComplete="off"
                  className="code"
                  value={inviteCode}
                  onChange={(event) => setInviteCode(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {t("inviteCodeHint")}
                </p>
              </div>
            )}

            {error && <FormError message={error} />}

            <Button type="submit" disabled={submitting}>
              {isLogin ? t("login") : t("createAccount")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
