import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { serverSettingsRepository } from "@/lib/repositories/server-settings-repository";
import { auditLogRepository } from "@/lib/repositories/audit-log-repository";
import { requireScope, parseJsonBody } from "@/lib/api/api-guards";
import {
  PASSWORD_LENGTH,
  SESSION,
  SITE_NAME_LENGTH,
  AVATAR_BYTES,
} from "@/lib/config";

const updateSchema = z.object({
  registrationMode: z.enum(["OPEN", "INVITE_ONLY"]).optional(),
  maintenanceMode: z.boolean().optional(),
  sessionDurationDays: z
    .number()
    .int()
    .min(SESSION.minDurationDays)
    .max(SESSION.maxDurationDays)
    .optional(),
  siteName: z.string().trim().max(SITE_NAME_LENGTH.max).nullable().optional(),
  avatarsEnabled: z.boolean().optional(),
  maxAvatarBytes: z
    .number()
    .int()
    .min(AVATAR_BYTES.min)
    .max(AVATAR_BYTES.maxCeiling)
    .optional(),
  allowAvatarUrl: z.boolean().optional(),
  // Clamped to the app's own hard floor below - an admin can raise it, never lower it below the safe minimum.
  minPasswordLength: z
    .number()
    .int()
    .min(1)
    .max(PASSWORD_LENGTH.max)
    .optional(),
  // null = unlimited. Not enforced by the sync endpoint yet, see schema.prisma.
  defaultMaxLibraryBytes: z.number().int().min(1).nullable().optional(),
  // Empty string clears it back to request-derived; trailing slash stripped below since it's used as a bare prefix.
  publicAppUrl: z
    .string()
    .trim()
    .max(2048)
    .refine(
      (value) => value === "" || /^https?:\/\/.+/.test(value),
      "Must be a full URL like https://example.com",
    )
    .nullable()
    .optional(),
  // Exact origins only - a CORS Origin header is always scheme+host+port, never a path/query/trailing slash.
  allowedOrigins: z
    .array(
      z
        .string()
        .trim()
        .max(255)
        .refine((value) => {
          try {
            const url = new URL(value);
            return (
              url.origin === value &&
              (url.protocol === "http:" || url.protocol === "https:")
            );
          } catch {
            return false;
          }
        }, "Must be a bare origin like https://example.com"),
    )
    .max(20)
    .optional(),
  nsfwGenreTags: z.array(z.string().max(100)).max(200).optional(),
  nsfwKeywords: z.array(z.string().trim().min(1).max(100)).max(200).optional(),
  nsfwSymbols: z.array(z.string().trim().min(1).max(10)).max(50).optional(),
  smtpHost: z.string().trim().max(255).nullable().optional(),
  smtpPort: z.number().int().min(1).max(65535).nullable().optional(),
  smtpSecure: z.boolean().optional(),
  smtpUser: z.string().trim().max(255).nullable().optional(),
  // Empty string clears it; omitted leaves it alone. Never round-tripped back to the browser.
  smtpPassword: z.string().max(500).nullable().optional(),
  smtpFrom: z.string().trim().max(255).nullable().optional(),
});

// Never sent to the browser, same as any other stored credential - callers only need to know one is set.
function maskSmtpPassword<T extends { smtpPassword: string | null }>(
  settings: T,
): Omit<T, "smtpPassword"> & { smtpPasswordSet: boolean } {
  const { smtpPassword, ...rest } = settings;
  return { ...rest, smtpPasswordSet: Boolean(smtpPassword) };
}

export async function GET(): Promise<NextResponse> {
  const user = await requireScope("MANAGE_SETTINGS");
  if (user instanceof NextResponse) return user;
  const settings = await serverSettingsRepository.get();
  return NextResponse.json({ settings: maskSmtpPassword(settings) });
}

export async function PATCH(request: Request): Promise<NextResponse> {
  const t = await getTranslations("Api");
  const user = await requireScope("MANAGE_SETTINGS");
  if (user instanceof NextResponse) return user;

  const parsedBody = await parseJsonBody(
    request,
    updateSchema,
    t("invalidRequest"),
  );
  if (parsedBody instanceof NextResponse) return parsedBody;
  const parsed = parsedBody;

  const data = { ...parsed.data };
  if (data.siteName === "") data.siteName = null;
  if (data.smtpHost === "") data.smtpHost = null;
  if (data.smtpUser === "") data.smtpUser = null;
  if (data.smtpFrom === "") data.smtpFrom = null;
  if (data.smtpPassword === "") data.smtpPassword = null;
  if (data.publicAppUrl === "") data.publicAppUrl = null;
  else if (data.publicAppUrl)
    data.publicAppUrl = data.publicAppUrl.replace(/\/+$/, "");
  if (data.minPasswordLength !== undefined) {
    data.minPasswordLength = Math.max(
      data.minPasswordLength,
      PASSWORD_LENGTH.min,
    );
  }

  const settings = await serverSettingsRepository.update(data);
  await auditLogRepository.record({
    actorId: user.id,
    actorUsername: user.username,
    action: "SETTINGS_CHANGED",
    metadata: {
      registrationMode: settings.registrationMode,
      maintenanceMode: settings.maintenanceMode,
      sessionDurationDays: settings.sessionDurationDays,
      siteName: settings.siteName,
      avatarsEnabled: settings.avatarsEnabled,
      maxAvatarBytes: settings.maxAvatarBytes,
      allowAvatarUrl: settings.allowAvatarUrl,
      minPasswordLength: settings.minPasswordLength,
      defaultMaxLibraryBytes: settings.defaultMaxLibraryBytes,
      publicAppUrl: settings.publicAppUrl,
      allowedOrigins: settings.allowedOrigins,
      nsfwGenreTags: settings.nsfwGenreTags,
      nsfwKeywords: settings.nsfwKeywords,
      nsfwSymbols: settings.nsfwSymbols,
      smtpHost: settings.smtpHost,
      smtpConfigured: Boolean(settings.smtpHost),
    },
  });
  return NextResponse.json({ settings: maskSmtpPassword(settings) });
}
