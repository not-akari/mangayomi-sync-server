"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/auth/csrf-client";

interface Session {
  id: string;
  createdAt: string;
}

export function SessionsClient({
  currentSessionId,
}: {
  currentSessionId: string | null;
}): React.ReactElement {
  const router = useRouter();
  const t = useTranslations("Account");
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/account/sessions")
      .then((response) => {
        if (!response.ok) throw new Error(`Request failed: ${response.status}`);
        return response.json() as Promise<{ sessions: Session[] }>;
      })
      .then((data) => {
        if (!cancelled) setSessions(data.sessions);
      })
      .catch(() => {
        if (!cancelled) setError(t("actionFailedFallback"));
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  async function handleRevoke(id: string): Promise<void> {
    setError(null);
    try {
      await apiFetch(`/api/account/sessions/${id}`, { method: "DELETE" });
      setSessions((current) => current?.filter((s) => s.id !== id) ?? null);
      if (id === currentSessionId) {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError(t("actionFailedFallback"));
    }
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {sessions === null && (
        <div
          role="status"
          aria-busy="true"
          aria-label={t("loading")}
          className="space-y-2"
        >
          {Array.from({ length: 2 }, (_, index) => (
            <Card key={index}>
              <CardContent className="flex items-center justify-between gap-4">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-8 w-20 shrink-0 rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {sessions && sessions.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("sessionsEmpty")}</p>
      )}
      {sessions && sessions.length > 0 && (
        <div className="space-y-2">
          {sessions.map((session) => (
            <Card key={session.id}>
              <CardContent className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm">
                    {new Date(session.createdAt).toLocaleString()}
                    {session.id === currentSessionId && (
                      <span className="ml-2 text-muted-foreground">
                        ({t("thisDevice")})
                      </span>
                    )}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleRevoke(session.id)}
                >
                  {t("revoke")}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
