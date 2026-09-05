import { getSessionUser } from "@/lib/auth/auth";
import { serverSettingsRepository } from "@/lib/repositories/server-settings-repository";
import { SiteHeaderClient } from "@/components/layout/site-header-client";

// Self-fetching wrapper for standalone Server Component pages (home, login, setup, password reset).
export async function SiteHeader(): Promise<React.ReactElement> {
  const [user, { siteName, avatarsEnabled }] = await Promise.all([
    getSessionUser(),
    serverSettingsRepository.get(),
  ]);

  return (
    <SiteHeaderClient
      user={user}
      siteName={siteName}
      avatarsEnabled={avatarsEnabled}
    />
  );
}
