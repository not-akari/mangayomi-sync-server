import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { ADMIN_SCOPE_VALUES, isScopeSubset } from "@/lib/auth/permissions";
import { invitePresetRepository } from "@/lib/repositories/invite-preset-repository";
import { requireScope, parseJsonBody } from "@/lib/api/api-guards";

const createSchema = z.object({
  name: z.string().trim().min(1).max(60),
  maxUses: z.number().int().positive().nullable().optional(),
  expiresInDays: z.number().int().positive().nullable().optional(),
  grantedScopes: z.array(z.enum(ADMIN_SCOPE_VALUES)).optional(),
  maxLibraryBytesOverride: z.number().int().positive().nullable().optional(),
});

export async function GET(): Promise<NextResponse> {
  const user = await requireScope("MANAGE_INVITES");
  if (user instanceof NextResponse) return user;
  const presets = await invitePresetRepository.listAll();
  return NextResponse.json({ presets });
}

export async function POST(request: Request): Promise<NextResponse> {
  const t = await getTranslations("Api");
  const user = await requireScope("MANAGE_INVITES");
  if (user instanceof NextResponse) return user;

  const parsedBody = await parseJsonBody(
    request,
    createSchema,
    t("invalidRequest"),
  );
  if (parsedBody instanceof NextResponse) return parsedBody;
  const parsed = parsedBody;

  const grantedScopes = parsed.data.grantedScopes ?? [];
  const grantedRole = grantedScopes.length > 0 ? "ADMIN" : "USER";
  if (!isScopeSubset(grantedScopes, user.scopes)) {
    return NextResponse.json(
      { error: t("forbiddenScope") },
      { status: 403 },
    );
  }

  try {
    const preset = await invitePresetRepository.create({
      name: parsed.data.name,
      createdById: user.id,
      maxUses: parsed.data.maxUses,
      expiresInDays: parsed.data.expiresInDays,
      grantedRole,
      grantedScopes,
      maxLibraryBytesOverride: parsed.data.maxLibraryBytesOverride,
    });
    return NextResponse.json({ preset }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: t("presetNameTaken") },
        { status: 409 },
      );
    }
    throw error;
  }
}
