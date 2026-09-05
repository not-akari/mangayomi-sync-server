import type { getTranslations } from "next-intl/server";
import type { AuditLog } from "@prisma/client";

type AdminTranslator = Awaited<ReturnType<typeof getTranslations<"Admin">>>;

// Shared between the admin-wide log and each user's own activity view.
export function describeAuditLog(entry: AuditLog, t: AdminTranslator): string {
  const metadata = (entry.metadata ?? {}) as Record<string, unknown>;
  const actor = entry.actorUsername;

  switch (entry.action) {
    case "USER_REGISTERED":
      return t("logs.userRegistered", { actor });
    case "USER_LOGIN":
      return t("logs.userLogin", { actor });
    case "INVITE_CREATED":
      return t("logs.inviteCreated", {
        actor,
        code: String(metadata.code ?? "?"),
      });
    case "INVITE_REVOKED":
      return metadata.bulk
        ? t("logs.inviteRevokedBulk", {
            actor,
            count: Number(metadata.count ?? 0),
          })
        : t("logs.inviteRevoked", {
            actor,
            code: String(metadata.code ?? "?"),
          });
    case "ROLE_CHANGED":
      return t("logs.roleChanged", {
        actor,
        target: String(metadata.targetUsername ?? "?"),
        role: metadata.newRole === "ADMIN" ? t("roleAdmin") : t("roleUser"),
      });
    case "SETTINGS_CHANGED":
      return t("logs.settingsChanged", { actor });
    case "ACCOUNT_SUSPENDED":
      return metadata.reason
        ? t("logs.accountSuspendedWithReason", {
            actor,
            target: String(metadata.targetUsername ?? "?"),
            reason: String(metadata.reason),
          })
        : t("logs.accountSuspended", {
            actor,
            target: String(metadata.targetUsername ?? "?"),
          });
    case "ACCOUNT_REINSTATED":
      return t("logs.accountReinstated", {
        actor,
        target: String(metadata.targetUsername ?? "?"),
      });
    case "PASSWORD_CHANGED":
      return t("logs.passwordChanged", { actor });
    case "ACCOUNT_DELETED":
      return t("logs.accountDeleted", { actor });
    case "PASSWORD_RESET_LINK_CREATED":
      return t("logs.passwordResetLinkCreated", {
        actor,
        target: String(metadata.targetUsername ?? "?"),
      });
    case "PASSWORD_RESET_REQUESTED":
      return t("logs.passwordResetRequested", { actor });
    case "PASSWORD_RESET_COMPLETED":
      return t("logs.passwordResetCompleted", { actor });
    case "EMAIL_CHANGED":
      return t("logs.emailChanged", { actor });
    case "AVATAR_CHANGED":
      return t("logs.avatarChanged", { actor });
    case "REPORT_CREATED":
      return t("logs.reportCreated", {
        actor,
        subject: String(metadata.subject ?? "?"),
      });
    case "REPORT_STATUS_CHANGED":
      return metadata.bulk
        ? t("logs.reportStatusChangedBulk", {
            actor,
            count: Number(metadata.count ?? 0),
            status: String(metadata.status ?? "?"),
          })
        : t("logs.reportStatusChanged", {
            actor,
            subject: String(metadata.subject ?? "?"),
            status: String(metadata.status ?? "?"),
          });
    case "REPORT_REPLY_CREATED":
      return t("logs.reportReplyCreated", {
        actor,
        subject: String(metadata.subject ?? "?"),
      });
    case "CATALOG_NSFW_OVERRIDE_SET": {
      const value =
        metadata.override === null
          ? t("logs.overrideAuto")
          : metadata.override
            ? t("logs.overrideNsfw")
            : t("logs.overrideSafe");
      return t("logs.catalogNsfwOverrideSet", {
        actor,
        title: String(metadata.title ?? "?"),
        value,
      });
    }
    case "CATALOG_NSFW_BULK_OVERRIDE_SET": {
      const value =
        metadata.override === null
          ? t("logs.overrideAuto")
          : metadata.override
            ? t("logs.overrideNsfw")
            : t("logs.overrideSafe");
      return t("logs.catalogNsfwBulkOverrideSet", {
        actor,
        count: Number(metadata.count ?? 0),
        value,
      });
    }
    case "SESSION_REVOKED":
      return metadata.byAdmin
        ? t("logs.sessionRevokedByAdmin", {
            actor,
            target: String(metadata.targetUsername ?? "?"),
          })
        : t("logs.sessionRevoked", { actor });
    case "TOTP_ENABLED":
      return t("logs.totpEnabled", { actor });
    case "TOTP_DISABLED":
      return t("logs.totpDisabled", { actor });
    case "TOTP_RECOVERY_CODE_USED":
      return t("logs.totpRecoveryCodeUsed", { actor });
    default:
      return entry.action;
  }
}
