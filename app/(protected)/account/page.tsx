import { getTranslations } from "next-intl/server";
import { getCurrentSessionId, getSessionUser } from "@/lib/auth/auth";
import { serverSettingsRepository } from "@/lib/repositories/server-settings-repository";
import { PageShell, PageHeader } from "@/components/layout/page-shell";
import { AccountForm } from "./account-form";

export default async function AccountPage(): Promise<React.ReactElement> {
  const [user, currentSessionId, t, { avatarsEnabled, allowAvatarUrl }] =
    await Promise.all([
      getSessionUser(),
      getCurrentSessionId(),
      getTranslations("Account"),
      serverSettingsRepository.get(),
    ]);

  return (
    <PageShell width="wide" className="gap-4">
      <PageHeader title={t("title")} description={user?.username} />

      {user && (
        <AccountForm
          userId={user.id}
          username={user.username}
          avatarUrl={user.avatarUrl}
          totpEnabled={user.totpEnabled}
          email={user.email}
          blurNsfw={user.blurNsfw}
          currentSessionId={currentSessionId}
          avatarsEnabled={avatarsEnabled}
          allowAvatarUrl={allowAvatarUrl}
        />
      )}
    </PageShell>
  );
}