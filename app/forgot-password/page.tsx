import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/auth";
import { SiteHeader } from "@/components/layout/site-header";
import { serverSettingsRepository } from "@/lib/repositories/server-settings-repository";
import { isEmailConfigured } from "@/lib/services/mail";
import { ForgotPasswordForm } from "./forgot-password-form";

export default async function ForgotPasswordPage(): Promise<React.ReactElement> {
  const [user, settings] = await Promise.all([
    getSessionUser(),
    serverSettingsRepository.get(),
  ]);
  if (user) {
    redirect("/account");
  }
  return (
    <>
      <SiteHeader />
      <ForgotPasswordForm emailConfigured={isEmailConfigured(settings)} />
    </>
  );
}
