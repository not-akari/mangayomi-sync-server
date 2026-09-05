import { db } from "@/lib/db";
import type { AdminScope, InvitePreset, Role } from "@prisma/client";
import type { DbClient } from "./client";

export const invitePresetRepository = {
  listAll(client: DbClient = db): Promise<InvitePreset[]> {
    return client.invitePreset.findMany({ orderBy: { name: "asc" } });
  },

  create(
    params: {
      name: string;
      createdById: string;
      maxUses?: number | null;
      expiresInDays?: number | null;
      grantedRole?: Role;
      grantedScopes?: AdminScope[];
      maxLibraryBytesOverride?: number | null;
    },
    client: DbClient = db,
  ): Promise<InvitePreset> {
    return client.invitePreset.create({
      data: {
        name: params.name,
        createdById: params.createdById,
        maxUses: params.maxUses ?? 1,
        expiresInDays: params.expiresInDays ?? null,
        grantedRole: params.grantedRole ?? "USER",
        grantedScopes: params.grantedScopes ?? [],
        maxLibraryBytesOverride: params.maxLibraryBytesOverride ?? null,
      },
    });
  },

  delete(id: string, client: DbClient = db): Promise<InvitePreset> {
    return client.invitePreset.delete({ where: { id } });
  },
};
