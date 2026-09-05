import { rateLimitRepository } from "@/lib/repositories/rate-limit-repository";
import { RATE_LIMIT_STALE_RETENTION_MS } from "@/lib/config";
import { hashIp } from "@/lib/auth/ip-hash";

// Every limiter upserts one row per key forever with no self-cleanup, so lib/gc.ts sweeps stale rows periodically.
export async function sweepStaleRateLimitAttempts(): Promise<number> {
  const { count } = await rateLimitRepository.deleteOlderThan(
    new Date(Date.now() - RATE_LIMIT_STALE_RETENTION_MS),
  );
  return count;
}

export interface BackoffOptions {
  // Delay before the 2nd attempt. Each subsequent attempt doubles it.
  baseDelayMs: number;
  // Delay is capped here regardless of how many attempts pile up.
  maxDelayMs: number;
  // No activity for this long fully forgets the caller's attempt history.
  resetAfterMs: number;
}

// Exponential backoff per key, stored in Postgres (not memory) so it survives restarts and works across instances.

// Backoff, not a fixed window, degrades gracefully: a few mistyped-password retries barely feel throttled, hammering slows hard.

// Plain read-then-upsert: two concurrent requests could both slip through, but the write itself stays atomic - a rare over-count, not a broken limiter.
export async function checkRateLimit(
  key: string,
  options: BackoffOptions,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const now = Date.now();
  const existing = await rateLimitRepository.find(key);

  const stale =
    existing && now - existing.lastAttemptAt.getTime() > options.resetAfterMs;
  const count = existing && !stale ? existing.attemptCount : 0;
  const lastAttemptAt =
    existing && !stale ? existing.lastAttemptAt.getTime() : 0;

  const requiredDelayMs =
    count === 0
      ? 0
      : Math.min(options.baseDelayMs * 2 ** (count - 1), options.maxDelayMs);
  const nextAllowedAt = lastAttemptAt + requiredDelayMs;

  if (count > 0 && now < nextAllowedAt) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((nextAllowedAt - now) / 1000),
    };
  }

  await rateLimitRepository.upsert(key, count + 1, new Date(now));
  return { allowed: true, retryAfterSeconds: 0 };
}

// Called after a successful login so mistyped-password retries don't leave the account throttled on the attempt that worked.
export async function resetRateLimit(key: string): Promise<void> {
  await rateLimitRepository.deleteByKey(key);
}

export interface FixedWindowOptions {
  maxAttempts: number;
  windowMs: number;
}

// A plain "N per window" counter for callers that legitimately fire many requests back to back and just need a ceiling.
export async function checkFixedWindowLimit(
  key: string,
  options: FixedWindowOptions,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const now = Date.now();
  const existing = await rateLimitRepository.find(key);

  const windowStart =
    existing && now - existing.lastAttemptAt.getTime() < options.windowMs
      ? existing.lastAttemptAt
      : new Date(now);
  const count =
    existing && windowStart === existing.lastAttemptAt
      ? existing.attemptCount
      : 0;

  if (count >= options.maxAttempts) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(
        (windowStart.getTime() + options.windowMs - now) / 1000,
      ),
    };
  }

  await rateLimitRepository.upsert(key, count + 1, windowStart);
  return { allowed: true, retryAfterSeconds: 0 };
}

// Proxy headers are only trusted when TRUST_PROXY_HEADERS=true is explicitly set.
export function getClientIp(request: Request): string {
  if (process.env.TRUST_PROXY_HEADERS !== "true") return "unknown";

  const cloudflare = request.headers.get("cf-connecting-ip");
  const forwardedRaw = request.headers.get("x-forwarded-for");
  const forwarded = forwardedRaw?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip");

  return cloudflare || forwarded || realIp || "unknown";
}

// Rate-limit keys store the hashed address to avoid persisting raw IP addresses.
export function getClientIpKey(request: Request): string {
  return hashIp(getClientIp(request));
}

// Route handlers have no built-in body size cap; checked against Content-Length before touching the body at all.
export function isBodyTooLarge(request: Request, maxBytes: number): boolean {
  const length = Number(request.headers.get("content-length"));
  return Number.isFinite(length) && length > maxBytes;
}
