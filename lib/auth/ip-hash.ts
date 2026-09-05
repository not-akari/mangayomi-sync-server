import { createHash, createHmac } from "node:crypto";

// Keyed HMAC prevents IPv4 enumeration while allowing equality checks for rate limiting.

let cachedKey: Buffer | null = null;

function ipHashKey(): Buffer {
  if (cachedKey) return cachedKey;
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is required before hashing IP addresses");
  }
  // Derived rather than reused directly, so this is not literally the session signing key.
  cachedKey = createHash("sha256").update(`${secret}:ip-hash:v1`).digest();
  return cachedKey;
}

// Stable, non-reversible identifier for an IP address.
export function hashIp(ip: string): string {
  if (ip === "unknown") return "unknown";
  return createHmac("sha256", ipHashKey()).update(ip).digest("hex");
}
