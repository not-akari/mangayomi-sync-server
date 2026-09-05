import { db } from "@/lib/db";
import type { AdminScope, Prisma, Role, User } from "@prisma/client";
import type { DbClient } from "./client";

export const userRepository = {
  findByUsername(
    username: string,
    client: DbClient = db,
  ): Promise<User | null> {
    return client.user.findUnique({ where: { username } });
  },

  findById(id: string, client: DbClient = db): Promise<User | null> {
    return client.user.findUnique({ where: { id } });
  },

  count(client: DbClient = db): Promise<number> {
    return client.user.count();
  },

  create(
    data: {
      username: string;
      passwordHash: string;
      role: Role;
      scopes?: AdminScope[];
      isPrimaryAdmin?: boolean;
      registeredIpHash?: string | null;
    },
    client: DbClient = db,
  ): Promise<User> {
    return client.user.create({ data });
  },

  // Check if IP matches any suspended user.
  async hasSuspendedUserWithIpHash(
    ipHash: string,
    client: DbClient = db,
  ): Promise<boolean> {
    const match = await client.user.findFirst({
      where: { registeredIpHash: ipHash, suspended: true },
      select: { id: true },
    });
    return match !== null;
  },

  updateAvatar(
    id: string,
    avatarUrl: string | null,
    client: DbClient = db,
  ): Promise<User> {
    return client.user.update({ where: { id }, data: { avatarUrl } });
  },

  updatePassword(
    id: string,
    passwordHash: string,
    client: DbClient = db,
  ): Promise<User> {
    return client.user.update({ where: { id }, data: { passwordHash } });
  },

  updateEmail(
    id: string,
    email: string | null,
    client: DbClient = db,
  ): Promise<User> {
    return client.user.update({ where: { id }, data: { email } });
  },

  updateBlurNsfw(
    id: string,
    blurNsfw: boolean,
    client: DbClient = db,
  ): Promise<User> {
    return client.user.update({ where: { id }, data: { blurNsfw } });
  },

  async listPage(
    params: { page: number; pageSize: number; search?: string },
    client: DbClient = db,
  ): Promise<{ users: User[]; total: number }> {
    const where: Prisma.UserWhereInput = params.search
      ? { username: { contains: params.search, mode: "insensitive" } }
      : {};
    const [users, total] = await Promise.all([
      client.user.findMany({
        where,
        orderBy: { createdAt: "asc" },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      client.user.count({ where }),
    ]);
    return { users, total };
  },

  countByRole(role: Role, client: DbClient = db): Promise<number> {
    return client.user.count({ where: { role } });
  },

  updateRoleAndScopes(
    id: string,
    role: Role,
    scopes: AdminScope[],
    client: DbClient = db,
  ): Promise<User> {
    return client.user.update({ where: { id }, data: { role, scopes } });
  },

  updateSuspended(
    id: string,
    suspended: boolean,
    reason: string | null,
    client: DbClient = db,
  ): Promise<User> {
    return client.user.update({
      where: { id },
      data: { suspended, suspendedReason: suspended ? reason : null },
    });
  },

  updateLibraryQuotaOverride(
    id: string,
    maxLibraryBytesOverride: number | null,
    client: DbClient = db,
  ): Promise<User> {
    return client.user.update({
      where: { id },
      data: { maxLibraryBytesOverride },
    });
  },

  deleteById(id: string, client: DbClient = db): Promise<User> {
    return client.user.delete({ where: { id } });
  },

  enableTotp(
    id: string,
    totpSecret: string,
    totpRecoveryCodeHashes: string[],
    client: DbClient = db,
  ): Promise<User> {
    return client.user.update({
      where: { id },
      data: { totpSecret, totpEnabled: true, totpRecoveryCodeHashes },
    });
  },

  disableTotp(id: string, client: DbClient = db): Promise<User> {
    return client.user.update({
      where: { id },
      data: {
        totpSecret: null,
        totpEnabled: false,
        totpRecoveryCodeHashes: [],
      },
    });
  },

  // Atomic recovery code consumption.
  async consumeTotpRecoveryCodeHash(
    id: string,
    hash: string,
    client: DbClient = db,
  ): Promise<number | null> {
    const rows = await client.$queryRaw<{ totpRecoveryCodeHashes: string[] }[]>`
      UPDATE "User"
      SET "totpRecoveryCodeHashes" = array_remove("totpRecoveryCodeHashes", ${hash})
      WHERE id = ${id} AND ${hash} = ANY("totpRecoveryCodeHashes")
      RETURNING "totpRecoveryCodeHashes"
    `;
    return rows[0] ? rows[0].totpRecoveryCodeHashes.length : null;
  },
};
