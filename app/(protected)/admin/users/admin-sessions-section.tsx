"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CollapsibleTrigger } from "@/components/layout/collapsible-row";
import { apiFetch } from "@/lib/auth/csrf-client";

interface AdminSession {
  id: string;
  createdAt: string;
}

export function AdminSessionsSection({
  userId,
}: {
  userId: string;
}): React.ReactElement {
  const t = useTranslations("Admin");
  const [expanded, setExpanded] = useState(false);
  const [sessions, setSessions] = useState<AdminSession[] | null>(null);

  useEffect(() => {
    if (!expanded) return;
    let cancelled = false;
    fetch(`/api/admin/users/${userId}/sessions`)
      .then((response) => {
        if (!response.ok) throw new Error(`Request failed: ${response.status}`);
        return response.json() as Promise<{ sessions: AdminSession[] }>;
      })
      .then((data) => {
        if (!cancelled) setSessions(data.sessions);
      })
      .catch(() => {
        if (!cancelled) setSessions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [expanded, userId]);

  async function handleRevoke(sessionId: string): Promise<void> {
    await apiFetch(`/api/admin/users/${userId}/sessions/${sessionId}`, {
      method: "DELETE",
    });
    setSessions(
      (current) => current?.filter((s) => s.id !== sessionId) ?? null,
    );
  }

  return (
    <div>
      <CollapsibleTrigger
        open={expanded}
        onToggle={() => setExpanded((e) => !e)}
        className="px-(--card-spacing) py-3 text-sm font-medium"
      >
        {t("userDetail.sessions")}
      </CollapsibleTrigger>
      {expanded && (
        <div className="flex flex-col gap-2 px-(--card-spacing) pb-3">
          {sessions === null ? (
            <div
              role="status"
              aria-busy="true"
              aria-label={t("loading")}
              className="flex flex-col gap-2"
            >
              {Array.from({ length: 2 }, (_, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-4 rounded-md border px-3 py-2"
                >
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-8 w-20 shrink-0 rounded-lg" />
                </div>
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("userDetail.noSessions")}
            </p>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between gap-4 rounded-md border px-3 py-2"
              >
                <span className="text-sm">
                  {new Date(session.createdAt).toLocaleString()}
                </span>
                <Button
                  variant="secondary"
                  onClick={() => handleRevoke(session.id)}
                >
                  {t("userDetail.revokeSession")}
                </Button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
