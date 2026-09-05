import { redirect } from "next/navigation";
import { isFreshInstall } from "@/lib/services/setup";
import { SiteHeader } from "@/components/layout/site-header";
import { SetupForm } from "./setup-form";

export default async function SetupPage(): Promise<React.ReactElement> {
  if (!(await isFreshInstall())) {
    redirect("/login");
  }
  return (
    <>
      <SiteHeader />
      <SetupForm />
    </>
  );
}
