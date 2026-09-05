import { db } from "@/lib/db";
import type { ServerSettings } from "@prisma/client";

const SINGLETON_ID = 1;

// Plain scalar fields only, not Prisma's UpdateInput type, whose { set: value } wrapper upsert's create branch doesn't accept.
type UpdatableFields = Omit<ServerSettings, "id" | "updatedAt">;

export const serverSettingsRepository = {
  // Upsert-on-read: a fresh install's database won't have the singleton row yet, so reading is what creates it with defaults.
  get(): Promise<ServerSettings> {
    return db.serverSettings.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID },
      update: {},
    });
  },

  update(data: Partial<UpdatableFields>): Promise<ServerSettings> {
    return db.serverSettings.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, ...data },
      update: data,
    });
  },
};
