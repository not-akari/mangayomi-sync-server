import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import type { AdminScope, InviteCode, Prisma, Role } from "@prisma/client";
import type { DbClient } from "./client";

type InviteWithRedemptionCount = Prisma.InviteCodeGetPayload<{
  include: { _count: { select: { redemptions: true } } };
}>;

export type InviteRedeemResult =
  | {
      ok: true;
      inviteCodeId: string;
      grantedRole: Role;
      grantedScopes: AdminScope[];
      maxLibraryBytesOverride: number | null;
    }
  | { ok: false; reason: "not_found" | "revoked" | "expired" | "used_up" };

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateCode(length = 8): string {
  const bytes = randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i++) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- byte % alphabet.length is always a valid index
    code += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  }
  return code;
}

function checkValidity(
  invite: Pick<
    InviteCode,
    | "revoked"
    | "expiresAt"
    | "maxUses"
    | "useCount"
    | "id"
    | "grantedRole"
    | "grantedScopes"
    | "maxLibraryBytesOverride"
  >,
): InviteRedeemResult {
  if (invite.revoked) return { ok: false, reason: "revoked" };
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return { ok: false, reason: "expired" };
  }
  if (invite.maxUses !== null && invite.useCount >= invite.maxUses) {
    return { ok: false, reason: "used_up" };
  }
  return {
    ok: true,
    inviteCodeId: invite.id,
    grantedRole: invite.grantedRole,
    grantedScopes: invite.grantedScopes,
    maxLibraryBytesOverride: invite.maxLibraryBytesOverride,
  };
}

export const inviteRepository = {
  create(params: {
    createdById: string;
    maxUses?: number | null;
    expiresAt?: Date | null;
    label?: string | null;
    grantedRole?: Role;
    grantedScopes?: AdminScope[];
    maxLibraryBytesOverride?: number | null;
  }): Promise<{ id: string; code: string }> {
    return db.inviteCode.create({
      data: {
        code: generateCode(),
        createdById: params.createdById,
        maxUses: params.maxUses ?? 1,
        expiresAt: params.expiresAt ?? null,
        label: params.label ?? null,
        grantedRole: params.grantedRole ?? "USER",
        grantedScopes: params.grantedScopes ?? [],
        maxLibraryBytesOverride: params.maxLibraryBytesOverride ?? null,
      },
      select: { id: true, code: true },
    });
  },

  listAll(): Promise<InviteWithRedemptionCount[]> {
    return db.inviteCode.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { redemptions: true } } },
    });
  },

  async redemptionsPage(
    inviteCodeId: string,
    {
      search,
      page,
      pageSize,
    }: { search: string; page: number; pageSize: number },
  ): Promise<{ redemptions: { username: string }[]; total: number }> {
    const where: Prisma.InviteRedemptionWhereInput = {
      inviteCodeId,
      ...(search
        ? { user: { username: { contains: search, mode: "insensitive" } } }
        : {}),
    };
    const [rows, total] = await Promise.all([
      db.inviteRedemption.findMany({
        where,
        include: { user: { select: { username: true } } },
        orderBy: { redeemedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.inviteRedemption.count({ where }),
    ]);
    return {
      redemptions: rows.map((r) => ({ username: r.user.username })),
      total,
    };
  },

  revoke(id: string): Promise<InviteCode> {
    return db.inviteCode.update({ where: { id }, data: { revoked: true } });
  },

  // Returns revoked code strings for audit logging.
  async revokeMany(ids: string[]): Promise<string[]> {
    const targets = await db.inviteCode.findMany({
      where: { id: { in: ids }, revoked: false },
      select: { id: true, code: true },
    });
    await db.inviteCode.updateMany({
      where: { id: { in: targets.map((t) => t.id) } },
      data: { revoked: true },
    });
    return targets.map((t) => t.code);
  },

  // Atomically validates and increments use count.
  async redeem(
    client: DbClient,
    code: string,
    userId: string,
  ): Promise<InviteRedeemResult> {
    const invite = await client.inviteCode.findUnique({ where: { code } });
    if (!invite) return { ok: false, reason: "not_found" };
    const result = checkValidity(invite);
    if (!result.ok) return result;

    await client.inviteCode.update({
      where: { id: invite.id },
      data: { useCount: { increment: 1 } },
    });
    await client.inviteRedemption.create({
      data: { inviteCodeId: invite.id, userId },
    });

    return result;
  },
};
