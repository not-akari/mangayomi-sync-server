import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/layout/site-header";
import { SelfHostedBadge } from "./self-hosted-badge";
import { HomeSeasonalDecoration } from "./home-seasonal-decoration";
import { isFreshInstall } from "@/lib/services/setup";

export default async function HomePage(): Promise<React.ReactElement> {
  if (await isFreshInstall()) {
    redirect("/setup");
  }
  const t = await getTranslations("HomePage");

  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="flex w-full max-w-xl flex-col items-start gap-6">
          <div className="relative">
            <Image
              src="/icon.png"
              alt=""
              width={64}
              height={64}
              className="rounded-2xl"
            />
            <HomeSeasonalDecoration />
          </div>
          <div className="flex flex-col gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-balance">
              {t("title")}
            </h1>
            <p className="max-w-[60ch] text-muted-foreground">
              {t("description")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button nativeButton={false} render={<Link href="/login" />}>
              {t("loginRegister")}
            </Button>
            <SelfHostedBadge label={t("disclaimer")} />
          </div>
        </div>
      </main>
    </>
  );
}
