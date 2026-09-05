import { createHash, createHmac, timingSafeEqual } from "crypto";

const PENDING_TTL_MS = 5 * 60 * 1000;

function deriveKey(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set.");
  }
  return createHash("sha256").update(`${secret}:totp-pending`).digest();
}

function sign(payload: string): string {
  return createHmac("sha256", deriveKey()).update(payload).digest("hex");
}

export function issuePendingTotpToken(
  userId: string,
  stayLoggedIn: boolean,
): string {
  const expiresAt = Date.now() + PENDING_TTL_MS;
  const payload = `${userId}.${stayLoggedIn ? 1 : 0}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyPendingTotpToken(
  token: string | null | undefined,
): { userId: string; stayLoggedIn: boolean } | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [userId, stayLoggedInRaw, expiresAtRaw, signature] = parts;
  if (!userId || !stayLoggedInRaw || !expiresAtRaw) return null;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;

  const expected = sign(`${userId}.${stayLoggedInRaw}.${expiresAtRaw}`);
  const expectedBuf = Buffer.from(expected, "hex");
  const actualBuf = Buffer.from(signature ?? "", "hex");
  if (expectedBuf.length !== actualBuf.length) return null;
  if (!timingSafeEqual(expectedBuf, actualBuf)) return null;
  return { userId, stayLoggedIn: stayLoggedInRaw === "1" };
}
