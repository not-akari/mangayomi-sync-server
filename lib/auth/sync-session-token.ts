import { createHash, createHmac, timingSafeEqual } from "crypto";
import { TOKEN_TTL_MS } from "@/lib/config";

// HMAC-signed token issued after a sync's first call; later calls in the same operation carrying it skip the fresh-start rate limit.
const SYNC_SESSION_TTL_MS = TOKEN_TTL_MS.syncSession;

// Derived from SESSION_SECRET rather than reused directly, so this token type doesn't share a raw key with JWT signing.
function deriveKey(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set.");
  }
  return createHash("sha256").update(`${secret}:sync-session`).digest();
}

function sign(payload: string): string {
  return createHmac("sha256", deriveKey()).update(payload).digest("hex");
}

export function issueSyncSessionToken(userId: string): string {
  const expiresAt = Date.now() + SYNC_SESSION_TTL_MS;
  const payload = `${userId}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySyncSessionToken(
  token: string | null | undefined,
  userId: string,
): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [tokenUserId, expiresAtRaw, signature] = parts;
  if (tokenUserId !== userId) return false;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;

  const expected = sign(`${tokenUserId}.${expiresAtRaw}`);
  const expectedBuf = Buffer.from(expected, "hex");
  const actualBuf = Buffer.from(signature ?? "", "hex");
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}
