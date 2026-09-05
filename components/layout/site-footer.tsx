import { getTranslations } from "next-intl/server";

export async function SiteFooter(): Promise<React.ReactElement> {
  const t = await getTranslations("SiteFooter");

  return (
    <footer className="flex flex-col gap-1 border-t px-6 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:gap-0">
      <span>
        {t("before")}{" "}
        <a
          href="https://github.com/kodjodevf/mangayomi"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Mangayomi
        </a>
        . {t("after")}
      </span>
      <div className="flex items-center gap-4">
        {/* TODO: fill in the real Discord invite link, left out rather than guessing one. */}
        <a
          href="https://github.com/kodjodevf/mangayomi"
          target="_blank"
          rel="noreferrer"
          className="hover:underline"
        >
          {t("github")}
        </a>
      </div>
    </footer>
  );
}
