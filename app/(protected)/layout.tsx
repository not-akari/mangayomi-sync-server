import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/auth";
import { serverSettingsRepository } from "@/lib/repositories/server-settings-repository";
import { AppShell } from "@/components/layout/app-shell";

// Checked once here, server-side, so any new page under this group gets protection automatically instead of its own copy.
export default async function ProtectedLayout({
  children,
}: LayoutProps<"/">): Promise<React.ReactElement> {
  const [user, { siteName, avatarsEnabled }] = await Promise.all([
    getSessionUser(),
    serverSettingsRepository.get(),
  ]);
  if (!user) {
    redirect("/login");
  }
  return (
    <AppShell
      user={user}
      scopes={user.scopes}
      siteName={siteName}
      avatarsEnabled={avatarsEnabled}
    >
      {children}
    </AppShell>
  );
}
