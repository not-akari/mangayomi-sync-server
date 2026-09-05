import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/auth";
import { serverSettingsRepository } from "@/lib/repositories/server-settings-repository";
import { isEmailConfigured } from "@/lib/services/mail";
import { AdminUserProvider } from "./admin-user-context";

export default async function AdminLayout({
  children,
}: LayoutProps<"/">): Promise<React.ReactElement> {
  const [user, settings] = await Promise.all([
    getSessionUser(),
    serverSettingsRepository.get(),
  ]);
  if (!user || user.role !== "ADMIN") {
    redirect("/library");
  }
  return (
    <AdminUserProvider
      value={{
        userId: user.id,
        scopes: user.scopes,
        emailConfigured: isEmailConfigured(settings),
      }}
    >
      {children}
    </AdminUserProvider>
  );
}
