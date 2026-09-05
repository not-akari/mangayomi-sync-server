"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  User,
  Shield,
  Settings,
  MonitorSmartphone,
  Database,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TabLayout, type NavTab } from "@/components/layout/nav-tabs";
import { AvatarClient } from "./avatar-client";
import { PasswordClient } from "./password-client";
import { TotpClient } from "./totp-client";
import { EmailClient } from "./email-client";
import { NsfwClient } from "./nsfw-client";
import { SessionsClient } from "./sessions-client";
import { ReportClient } from "./report-client";
import { DeleteAccountClient } from "./delete-account-client";

interface AccountFormProps {
  userId: string;
  username: string;
  avatarUrl: string | null;
  totpEnabled: boolean;
  email: string | null;
  blurNsfw: boolean;
  currentSessionId: string | null;
  avatarsEnabled: boolean;
  allowAvatarUrl: boolean;
}

export function AccountForm({
  username,
  avatarUrl,
  totpEnabled,
  email,
  blurNsfw,
  currentSessionId,
  avatarsEnabled,
  allowAvatarUrl,
}: AccountFormProps): React.ReactElement {
  const t = useTranslations("Account");
  const [tab, setTab] = useState("profile");

  const tabs: NavTab[] = [
    { key: "profile", label: t("tabs.profile"), icon: User },
    { key: "security", label: t("tabs.security"), icon: Shield },
    { key: "preferences", label: t("tabs.preferences"), icon: Settings },
    { key: "sessions", label: t("tabs.sessions"), icon: MonitorSmartphone },
    { key: "data", label: t("tabs.data"), icon: Database },
    { key: "danger", label: t("tabs.danger"), icon: AlertTriangle, danger: true },
  ];

  return (
    <TabLayout tabs={tabs} active={tab} onSelect={setTab} label={t("title")}>
      {tab === "profile" && (
        <>
          {avatarsEnabled && (
            <Card>
              <CardHeader>
                <CardTitle>{t("avatarTitle")}</CardTitle>
              </CardHeader>
              <CardContent>
                <AvatarClient
                  username={username}
                  initialAvatarUrl={avatarUrl}
                  allowAvatarUrl={allowAvatarUrl}
                />
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle>{t("emailTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <EmailClient initialEmail={email} />
            </CardContent>
          </Card>
        </>
      )}

      {tab === "security" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{t("passwordTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <PasswordClient />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("totpTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <TotpClient initialEnabled={totpEnabled} />
            </CardContent>
          </Card>
        </>
      )}

      {tab === "preferences" && (
        <Card>
          <CardHeader>
            <CardTitle>{t("browsingTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <NsfwClient initialBlurNsfw={blurNsfw} />
          </CardContent>
        </Card>
      )}

      {tab === "sessions" && (
        <Card>
          <CardHeader>
            <CardTitle>{t("sessionsTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <SessionsClient currentSessionId={currentSessionId} />
          </CardContent>
        </Card>
      )}

      {tab === "data" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{t("activityTitle")}</CardTitle>
              <CardDescription>
                {t("activityAccountDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="secondary"
                size="sm"
                className="w-fit"
                nativeButton={false}
                render={<Link href="/account/activity" />}
              >
                {t("activityViewButton")}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("reportTitle")}</CardTitle>
              <CardDescription>{t("reportDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ReportClient />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("exportTitle")}</CardTitle>
              <CardDescription>{t("exportDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="secondary"
                size="sm"
                className="w-fit"
                nativeButton={false}
                render={<a href="/api/account/export" download />}
              >
                {t("exportButton")}
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      {tab === "danger" && (
        <Card className="bg-destructive/5 ring-destructive/25">
          <CardHeader>
            <CardTitle className="text-destructive">
              {t("deleteTitle")}
            </CardTitle>
            <CardDescription>{t("deleteDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <DeleteAccountClient />
          </CardContent>
        </Card>
      )}
    </TabLayout>
  );
}