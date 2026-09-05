import { randomBytes, createHash } from "crypto";
import { db } from "@/lib/db";
import type { DbClient } from "./client";
import { TOKEN_TTL_MS as TOKEN_TTLS } from "@/lib/config";

const TOKEN_TTL_MS = TOKEN_TTLS.passwordReset;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export const passwordResetRepository = {
  // Returns the raw token; only this call ever sees it. Everything else works off the hash, same as session/CSRF tokens.
  async create(userId: string, client: DbClient = db): Promise<string> {
    const token = randomBytes(32).toString("hex");
    await client.passwordResetToken.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      },
    });
    return token;
  },

  // Marks the token used and returns its account, or null if missing/expired/used - the caller can't tell which, deliberately.
  async consume(token: string, client: DbClient = db): Promise<string | null> {
    const record = await client.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    if (!record || record.usedAt || record.expiresAt < new Date()) return null;
    await client.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
    return record.userId;
  },

  // consume() already rejects a used/expired token permanently, so this cleanup is just reclaiming dead weight.
  deleteDead(now: Date, client: DbClient = db): Promise<{ count: number }> {
    return client.passwordResetToken.deleteMany({
      where: { OR: [{ usedAt: { not: null } }, { expiresAt: { lt: now } }] },
    });
  },
};
