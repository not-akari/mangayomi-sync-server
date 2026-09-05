import { randomBytes, createHash } from "crypto";
import { db } from "@/lib/db";
import type { DbClient } from "./client";
import { TOKEN_TTL_MS } from "@/lib/config";

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export const oauthRepository = {
  // Returns the raw code once; everything else stores only its hash.
  async create(
    userId: string,
    codeChallenge: string,
    redirectUri: string,
    client: DbClient = db,
  ): Promise<string> {
    const code = randomBytes(32).toString("hex");
    await client.oAuthCode.create({
      data: {
        userId,
        codeHash: hashCode(code),
        codeChallenge,
        redirectUri,
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS.oauthCode),
      },
    });
    return code;
  },

  // Marks the code used, or returns null if missing/expired/used.
  async consume(
    code: string,
    client: DbClient = db,
  ): Promise<{
    userId: string;
    codeChallenge: string;
    redirectUri: string;
  } | null> {
    const record = await client.oAuthCode.findUnique({
      where: { codeHash: hashCode(code) },
    });
    if (!record || record.usedAt || record.expiresAt < new Date()) return null;
    await client.oAuthCode.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
    return {
      userId: record.userId,
      codeChallenge: record.codeChallenge,
      redirectUri: record.redirectUri,
    };
  },

  deleteDead(now: Date, client: DbClient = db): Promise<{ count: number }> {
    return client.oAuthCode.deleteMany({
      where: { OR: [{ usedAt: { not: null } }, { expiresAt: { lt: now } }] },
    });
  },
};
