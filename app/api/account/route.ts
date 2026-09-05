import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import { verifyPassword } from "@/lib/auth/password";
import { userRepository } from "@/lib/repositories/user-repository";
import { auditLogRepository } from "@/lib/repositories/audit-log-repository";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { requireUser, parseJsonBody, tooManyRequests } from "@/lib/api/api-guards";
import { RATE_LIMIT_BACKOFF } from "@/lib/config";

const deleteSchema = z.object({
  password: z.string().min(1),
});

const emailSchema = z.object({
  email: z.string().trim().toLowerCase().email().nullable(),
});

export async function PATCH(request: Request): Promise<NextResponse> {
  const t = await getTranslations("Api");
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const parsedBody = await parseJsonBody(
    request,
    emailSchema,
    t("invalidRequest"),
  );
  if (parsedBody instanceof NextResponse) return parsedBody;
  const parsed = parsedBody;

  try {
    const updated = await userRepository.updateEmail(
      user.id,
      parsed.data.email,
    );
    await auditLogRepository.record({
      actorId: user.id,
      actorUsername: user.username,
      action: "EMAIL_CHANGED",
      targetId: user.id,
    });
    return NextResponse.json({ email: updated.email });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ error: t("emailTaken") }, { status: 409 });
    }
    throw error;
  }
}

export async function DELETE(request: Request): Promise<NextResponse> {
  const t = await getTranslations("Api");
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const { allowed, retryAfterSeconds } = await checkRateLimit(
    `account-delete:${user.id}`,
    RATE_LIMIT_BACKOFF.accountDelete,
  );
  if (!allowed) {
    return tooManyRequests(retryAfterSeconds, t("tooManyRequests"));
  }

  const parsedBody = await parseJsonBody(
    request,
    deleteSchema,
    t("invalidRequest"),
  );
  if (parsedBody instanceof NextResponse) return parsedBody;
  const parsed = parsedBody;

  const passwordValid = await verifyPassword(
    user.passwordHash,
    parsed.data.password,
  );
  if (!passwordValid) {
    return NextResponse.json(
      { error: t("currentPasswordIncorrect") },
      { status: 401 },
    );
  }

  // Blocked, not just discouraged: the sole admin deleting themselves would leave no one able to promote a replacement.
  if (
    user.role === "ADMIN" &&
    (await userRepository.countByRole("ADMIN")) === 1
  ) {
    return NextResponse.json(
      { error: t("cannotDeleteSoleAdmin") },
      { status: 400 },
    );
  }

  await auditLogRepository.record({
    actorId: user.id,
    actorUsername: user.username,
    action: "ACCOUNT_DELETED",
  });
  await userRepository.deleteById(user.id);

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
