"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/layout/user-avatar";
import { apiFetch } from "@/lib/auth/csrf-client";
import { extractErrorMessage } from "@/lib/api/api-error-client";

export function AvatarClient({
  username,
  initialAvatarUrl,
  allowAvatarUrl,
}: {
  username: string;
  initialAvatarUrl: string | null;
  allowAvatarUrl: boolean;
}): React.ReactElement {
  const router = useRouter();
  const t = useTranslations("Account");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [urlInput, setUrlInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function applyResponse(
    response: Response,
    fallbackErrorKey: string,
  ): Promise<void> {
    if (!response.ok) {
      setError(await extractErrorMessage(response, t(fallbackErrorKey)));
      return;
    }
    const data = (await response.json()) as { avatarUrl: string };
    setAvatarUrl(data.avatarUrl);
    router.refresh();
  }

  async function handleFileChange(
    event: FormEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await apiFetch("/api/account/avatar", {
        method: "POST",
        body: formData,
      });
      await applyResponse(response, "avatarUploadFailedFallback");
    } catch {
      setError(t("avatarUploadFailedFallback"));
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleUrlSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!urlInput) return;
    setError(null);
    setBusy(true);
    try {
      const response = await apiFetch("/api/account/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput }),
      });
      await applyResponse(response, "avatarUploadFailedFallback");
      setUrlInput("");
    } catch {
      setError(t("avatarUploadFailedFallback"));
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(): Promise<void> {
    setError(null);
    setBusy(true);
    try {
      await apiFetch("/api/account/avatar", { method: "DELETE" });
      setAvatarUrl(null);
      router.refresh();
    } catch {
      setError(t("avatarUploadFailedFallback"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4">
        <UserAvatar username={username} avatarUrl={avatarUrl} size="lg" />
        <div className="flex flex-1 flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
          >
            {t("avatarUpload")}
          </Button>
          {avatarUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={handleRemove}
            >
              {t("avatarRemove")}
            </Button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          disabled={busy}
          onChange={handleFileChange}
        />
      </div>

      {allowAvatarUrl && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {t("avatarUrlPlaceholder")}
          </p>
          <form onSubmit={handleUrlSubmit} className="flex gap-2">
            <Input
              placeholder="https://example.com/avatar.jpg"
              value={urlInput}
              disabled={busy}
              onChange={(event) => setUrlInput(event.target.value)}
              className="flex-1"
            />
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              disabled={busy || !urlInput}
            >
              {t("avatarUrlApply")}
            </Button>
          </form>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
