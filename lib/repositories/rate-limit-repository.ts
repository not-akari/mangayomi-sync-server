import { db } from "@/lib/db";
import type { RateLimitAttempt } from "@prisma/client";

export const rateLimitRepository = {
  find(key: string): Promise<RateLimitAttempt | null> {
    return db.rateLimitAttempt.findUnique({ where: { key } });
  },

  upsert(
    key: string,
    attemptCount: number,
    lastAttemptAt: Date,
  ): Promise<RateLimitAttempt> {
    return db.rateLimitAttempt.upsert({
      where: { key },
      create: { key, attemptCount, lastAttemptAt },
      update: { attemptCount, lastAttemptAt },
    });
  },

  deleteByKey(key: string): Promise<{ count: number }> {
    return db.rateLimitAttempt.deleteMany({ where: { key } });
  },

  deleteOlderThan(cutoff: Date): Promise<{ count: number }> {
    return db.rateLimitAttempt.deleteMany({
      where: { lastAttemptAt: { lt: cutoff } },
    });
  },
};
