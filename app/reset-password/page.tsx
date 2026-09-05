import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/auth";
import { SiteHeader } from "@/components/layout/site-header";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage(): Promise<React.ReactElement> {
  const user = await getSessionUser();
  if (user) {
    redirect("/account");
  }
  return (
    <>
      <SiteHeader />
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </>
  );
}
