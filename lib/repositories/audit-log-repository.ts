import { db } from "@/lib/db";
import type { AuditAction, AuditLog, Prisma } from "@prisma/client";
import type { DbClient } from "./client";

export const auditLogRepository = {
  record(
    params: {
      actorId?: string;
      actorUsername: string;
      action: AuditAction;
      targetId?: string;
      metadata?: Prisma.InputJsonValue;
    },
    client: DbClient = db,
  ): Promise<AuditLog> {
    return client.auditLog.create({ data: params });
  },

  async listPage(
    params: {
      page: number;
      pageSize: number;
      action?: AuditAction;
      search?: string;
    },
    client: DbClient = db,
  ): Promise<{ entries: AuditLog[]; total: number }> {
    const where: Prisma.AuditLogWhereInput = {
      ...(params.action ? { action: params.action } : {}),
      ...(params.search
        ? { actorUsername: { contains: params.search, mode: "insensitive" } }
        : {}),
    };
    const [entries, total] = await Promise.all([
      client.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      client.auditLog.count({ where }),
    ]);
    return { entries, total };
  },

  // A user's own activity: things they did (actorId) plus things done to their account by someone else (targetId).
  async listForUser(
    userId: string,
    params: { page: number; pageSize: number },
    client: DbClient = db,
  ): Promise<{ entries: AuditLog[]; total: number }> {
    const where: Prisma.AuditLogWhereInput = {
      OR: [{ actorId: userId }, { targetId: userId }],
    };
    const [entries, total] = await Promise.all([
      client.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      client.auditLog.count({ where }),
    ]);
    return { entries, total };
  },
};
