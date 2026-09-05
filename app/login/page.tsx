import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/auth";
import { isFreshInstall } from "@/lib/services/setup";
import { isSafeNext } from "@/lib/auth/safe-redirect";
import { SiteHeader } from "@/components/layout/site-header";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">): Promise<React.ReactElement> {
  const { next } = await searchParams;
  const safeNext = isSafeNext(next) ? next : "/library";

  const user = await getSessionUser();
  if (user) {
    redirect(safeNext);
  }
  if (await isFreshInstall()) {
    redirect("/setup");
  }
  return (
    <>
      <SiteHeader />
      <LoginForm next={safeNext} />
    </>
  );
}
