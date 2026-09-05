import { db } from "@/lib/db";
import type { Session, User } from "@prisma/client";

export const sessionRepository = {
  create(userId: string): Promise<Session> {
    return db.session.create({ data: { userId } });
  },

  findByIdWithUser(id: string): Promise<(Session & { user: User }) | null> {
    return db.session.findUnique({ where: { id }, include: { user: true } });
  },

  listActiveByUserId(userId: string): Promise<Session[]> {
    return db.session.findMany({
      where: { userId, revoked: false },
      orderBy: { createdAt: "desc" },
    });
  },

  countActive(): Promise<number> {
    return db.session.count({ where: { revoked: false } });
  },

  revokeById(id: string): Promise<Session> {
    return db.session.update({ where: { id }, data: { revoked: true } });
  },

  revokeByIdForUser(id: string, userId: string): Promise<{ count: number }> {
    return db.session.updateMany({
      where: { id, userId },
      data: { revoked: true },
    });
  },

  // Used after a password change: every other device is signed out, excluding the session making the change itself.
  revokeAllForUserExcept(
    userId: string,
    exceptSessionId: string,
  ): Promise<{ count: number }> {
    return db.session.updateMany({
      where: { userId, id: { not: exceptSessionId }, revoked: false },
      data: { revoked: true },
    });
  },

  // Used when an admin suspends an account: every active session is cut immediately, not just future logins.
  revokeAllForUser(userId: string): Promise<{ count: number }> {
    return db.session.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });
  },

  // A revoked session is permanently dead the moment it's revoked, so the age check is just a safety margin, not a need.
  deleteRevokedOlderThan(cutoff: Date): Promise<{ count: number }> {
    return db.session.deleteMany({
      where: { revoked: true, createdAt: { lt: cutoff } },
    });
  },
};
