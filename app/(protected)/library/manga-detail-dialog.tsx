"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CatalogCover } from "@/components/layout/catalog-cover";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { LibraryEntryDetail } from "@/types/api";

export function MangaDetailDialog({
  clientId,
  onOpenChange,
}: {
  clientId: number | null;
  onOpenChange: (open: boolean) => void;
}): React.ReactElement {
  const t = useTranslations("LibraryPage");
  const [result, setResult] = useState<{
    entry: LibraryEntryDetail;
    blurNsfw: boolean;
  } | null>(null);
  const [error, setError] = useState(false);
  const [revealed, setRevealed] = useState(false);

  // Reset on open/close during render rather than in an effect, so it doesn't cost an extra render pass.
  const [prevClientId, setPrevClientId] = useState(clientId);
  if (clientId !== prevClientId) {
    setPrevClientId(clientId);
    setResult(null);
    setError(false);
    setRevealed(false);
  }

  useEffect(() => {
    if (clientId === null) return;
    let cancelled = false;
    fetch(`/api/library/${clientId}`)
      .then((response) => {
        if (!response.ok) throw new Error(`Request failed: ${response.status}`);
        return response.json() as Promise<{
          entry: LibraryEntryDetail;
          blurNsfw: boolean;
        }>;
      })
      .then((data) => {
        if (!cancelled) setResult(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const blurred =
    result !== null &&
    result.blurNsfw &&
    result.entry.isLikelyNsfw &&
    !revealed;

  return (
    <Dialog open={clientId !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
        {error && <p className="text-destructive text-sm">{t("error")}</p>}
        {!error && result === null && (
          <div
            role="status"
            aria-busy="true"
            aria-label={t("loading")}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <div className="flex gap-4">
              <Skeleton className="aspect-[2/3] w-28 shrink-0" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          </div>
        )}
        {result !== null && (
          <>
            <DialogHeader>
              <DialogTitle>{result.entry.name}</DialogTitle>
              <DialogDescription>
                {result.entry.itemType} · {result.entry.status}
                {result.entry.source ? ` · ${result.entry.source}` : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-4">
              <div className="relative w-28 shrink-0">
                <CatalogCover
                  src={result.entry.imageUrl}
                  alt={result.entry.name ?? ""}
                  className={cn(
                    "aspect-[2/3] w-full rounded-md object-cover",
                    blurred && "blur-lg",
                  )}
                />
                {blurred && (
                  <button
                    type="button"
                    onClick={() => setRevealed(true)}
                    className="absolute inset-0 flex items-center justify-center rounded-md bg-black/40 text-xs font-medium text-white"
                  >
                    {t("revealNsfw")}
                  </button>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2 text-sm">
                {result.entry.author && (
                  <p>
                    <span className="text-muted-foreground">
                      {t("detailAuthor")}:{" "}
                    </span>
                    {result.entry.author}
                    {result.entry.artist &&
                    result.entry.artist !== result.entry.author
                      ? ` / ${result.entry.artist}`
                      : ""}
                  </p>
                )}
                <p>
                  <span className="text-muted-foreground">
                    {t("detailChapters")}:{" "}
                  </span>
                  {t("detailChaptersProgress", {
                    read: result.entry.readChapters,
                    total: result.entry.totalChapters,
                  })}
                </p>
                {result.entry.lang && (
                  <p>
                    <span className="text-muted-foreground">
                      {t("detailLanguage")}:{" "}
                    </span>
                    {result.entry.lang}
                  </p>
                )}
                {result.entry.genre.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {result.entry.genre.map((tag) => (
                      <span
                        key={tag}
                        className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {result.entry.description && (
              <p className="text-muted-foreground text-sm whitespace-pre-line">
                {result.entry.description}
              </p>
            )}
            {result.entry.link && /^https?:\/\//.test(result.entry.link) && (
              <a
                href={result.entry.link}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium underline underline-offset-4"
              >
                {t("detailOpenSource")}
              </a>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
