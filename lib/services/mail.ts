import nodemailer from "nodemailer";
import type { SentMessageInfo } from "nodemailer";
import type { ServerSettings } from "@prisma/client";
import { decryptSecret } from "@/lib/auth/secret-crypto";

type SmtpSettings = Pick<
  ServerSettings,
  | "smtpHost"
  | "smtpPort"
  | "smtpSecure"
  | "smtpUser"
  | "smtpPassword"
  | "smtpFrom"
>;

// smtpHost's presence is the on/off switch for email recovery - no separate "enabled" flag to drift out of sync.
export function isEmailConfigured(
  settings: Pick<ServerSettings, "smtpHost">,
): boolean {
  return Boolean(settings.smtpHost);
}

function buildTransporter(
  settings: SmtpSettings,
): ReturnType<typeof nodemailer.createTransport> {
  return nodemailer.createTransport({
    host: settings.smtpHost ?? undefined,
    port: settings.smtpPort ?? 587,
    secure: settings.smtpSecure,
    auth: settings.smtpUser
      ? {
          user: settings.smtpUser,
          pass: settings.smtpPassword
            ? decryptSecret(settings.smtpPassword)
            : undefined,
        }
      : undefined,
  });
}

// Resolving only means the SMTP server accepted it for relay, not delivery - the full response lets callers detect a silent bounce.
export async function sendTestEmail(
  settings: SmtpSettings,
  to: string,
): Promise<SentMessageInfo> {
  if (!settings.smtpHost) {
    throw new Error("SMTP is not configured.");
  }
  return buildTransporter(settings).sendMail({
    from: settings.smtpFrom || settings.smtpUser || "no-reply@localhost",
    to,
    subject: "Test email",
    text: "This is a test email from your sync-mangayomi server's SMTP settings. If you received this, they're working.",
  });
}

export async function sendPasswordResetEmail(
  settings: SmtpSettings,
  to: string,
  resetUrl: string,
): Promise<SentMessageInfo | null> {
  if (!settings.smtpHost) return null;
  return buildTransporter(settings).sendMail({
    from: settings.smtpFrom || settings.smtpUser || "no-reply@localhost",
    to,
    subject: "Reset your password",
    text: `Someone requested a password reset for this account.\n\nReset it here (expires in 1 hour): ${resetUrl}\n\nIf this wasn't you, ignore this email.`,
  });
}
