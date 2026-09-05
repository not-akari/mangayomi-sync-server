// Every tunable magic-number constant in the app, in one place. Plain data only, safe for client imports.

// Pagination
export const PAGE_SIZE = {
  accountActivity: 25,
  adminCatalogLibrary: 30,
  adminInviteRedemptions: 25,
  adminLogs: 25,
  adminUsers: 25,
  history: 25,
  library: 24,
  tracking: 25,
  updates: 25,
};

// Request body size limits (bytes)
export const MAX_BODY_BYTES = {
  login: 4 * 1024,
  register: 4 * 1024,
  reports: 8 * 1024,
  forgotPassword: 1024,
  resetPassword: 1024,
  oauthToken: 2 * 1024,
  loginTotp: 1024,
  // A big backlog synced for the first time can carry thousands of rows, well past a typical JSON API body size.
  sync: 25 * 1024 * 1024,
};

// Rate-limit backoff - each is {baseDelayMs, maxDelayMs, resetAfterMs} for lib/rate-limit.ts's checkRateLimit.
export const RATE_LIMIT_BACKOFF = {
  // 1s, 2s, 4s, 8s ... capped at 15min once someone's clearly hammering it; a day of inactivity forgets the history.
  login: {
    baseDelayMs: 1000,
    maxDelayMs: 15 * 60 * 1000,
    resetAfterMs: 24 * 60 * 60 * 1000,
  },
  // Slower-growing than login's since an invite code is impractical to brute-force, but still stops enumeration/spam-create abuse.
  register: {
    baseDelayMs: 2000,
    maxDelayMs: 30 * 60 * 1000,
    resetAfterMs: 24 * 60 * 60 * 1000,
  },
  // Same shape as login's: a few genuine retries barely feel throttled, sustained hammering slows hard.
  forgotPassword: {
    baseDelayMs: 5000,
    maxDelayMs: 30 * 60 * 1000,
    resetAfterMs: 24 * 60 * 60 * 1000,
  },
  // Tighter than login's: a token is single-use anyway, this mostly guards against brute-forcing a valid token string.
  resetPassword: {
    baseDelayMs: 2000,
    maxDelayMs: 15 * 60 * 1000,
    resetAfterMs: 24 * 60 * 60 * 1000,
  },
  accountDelete: {
    baseDelayMs: 1000,
    maxDelayMs: 15 * 60 * 1000,
    resetAfterMs: 24 * 60 * 60 * 1000,
  },
  // Same shape as login's backoff: still "prove you know the current password," so it deserves the same brute-force protection.
  accountPassword: {
    baseDelayMs: 1000,
    maxDelayMs: 15 * 60 * 1000,
    resetAfterMs: 24 * 60 * 60 * 1000,
  },
  // A 6-digit code is only 1,000,000 possibilities, tighter than login's own backoff since that's genuinely brute-forceable.
  totpVerify: {
    baseDelayMs: 2000,
    maxDelayMs: 15 * 60 * 1000,
    resetAfterMs: 24 * 60 * 60 * 1000,
  },
  // Keyed per account via pending userId to prevent distributed guessing attacks.
  loginTotp: {
    baseDelayMs: 2000,
    maxDelayMs: 15 * 60 * 1000,
    resetAfterMs: 24 * 60 * 60 * 1000,
  },
  // Keyed per account, not per IP: authenticated, so the thing worth capping is one account repeatedly writing to disk.
  accountAvatar: {
    baseDelayMs: 1000,
    maxDelayMs: 10 * 60 * 1000,
    resetAfterMs: 60 * 60 * 1000,
  },
  adminInviteCreate: {
    baseDelayMs: 500,
    maxDelayMs: 5 * 60 * 1000,
    resetAfterMs: 60 * 60 * 1000,
  },
  adminSettingsTestEmail: {
    baseDelayMs: 5000,
    maxDelayMs: 5 * 60 * 1000,
    resetAfterMs: 60 * 60 * 1000,
  },
  reportCreate: {
    baseDelayMs: 30 * 1000,
    maxDelayMs: 30 * 60 * 1000,
    resetAfterMs: 24 * 60 * 60 * 1000,
  },
  reportReply: {
    baseDelayMs: 2000,
    maxDelayMs: 5 * 60 * 1000,
    resetAfterMs: 60 * 60 * 1000,
  },
  // Unauthenticated and more spam-prone than the logged-in path, so a slower base delay makes sustained abuse expensive faster.
  reportCreatePublic: {
    baseDelayMs: 60 * 1000,
    maxDelayMs: 60 * 60 * 1000,
    resetAfterMs: 24 * 60 * 60 * 1000,
  },
  // The code itself is high-entropy (32 random bytes) so this mainly guards against sheer request volume, same shape as login's.
  oauthToken: {
    baseDelayMs: 1000,
    maxDelayMs: 15 * 60 * 1000,
    resetAfterMs: 24 * 60 * 60 * 1000,
  },
};

// Sync endpoint
export const SYNC = {
  // A full 5000-row batch needs several sequential DB round trips per row, easily exceeding Prisma's default 5s transaction timeout.
  transactionTimeoutMs: 60_000,
  // Only gates a *fresh* sync (no valid sessionToken); pagination reuses the token so it never hits this.
  freshLimit: { maxAttempts: 20, windowMs: 60 * 1000 },
  // Coarse circuit breaker independent of the token so it can't be bypassed by anyone holding a valid one.
  dailyCircuitBreaker: { maxAttempts: 50_000, windowMs: 24 * 60 * 60 * 1000 },
  // Generous but bounded, trading multiple round trips for predictable response/query cost.
  pullPageSize: 2000,
  maxRowsPerEntity: 5000,
};

// Bulk operation id-count limits
export const MAX_BULK_IDS = {
  catalogLibrary: 500,
  invites: 200,
  reports: 200,
};

// Session / token lifetimes
export const SESSION = {
  minDurationDays: 1,
  maxDurationDays: 365,
  // "Stay logged in" unchecked: a short-lived token backstop paired with the session-only cookie, in case the browser restores it.
  shortDurationSeconds: 24 * 60 * 60,
};

export const TOKEN_TTL_MS = {
  passwordReset: 60 * 60 * 1000,
  syncSession: 30 * 60 * 1000,
  // Short: the app exchanges it within seconds of the redirect, never shown to or typed by the user like a password-reset link is.
  oauthCode: 2 * 60 * 1000,
};

// Account/admin field bounds
export const USERNAME_LENGTH = { min: 3, max: 32 };
export const PASSWORD_LENGTH = {
  min: 8,
  // Argon2's cost scales with input size - caps forced-expensive-hash abuse without limiting any realistic passphrase.
  max: 256,
};
export const INVITE_CODE_LENGTH = { max: 32 };
export const SITE_NAME_LENGTH = { max: 64 };
export const AVATAR_BYTES = {
  // 64KB, small enough to be pointless below this.
  min: 64 * 1024,
  // 10MB hard ceiling regardless of admin preference.
  maxCeiling: 10 * 1024 * 1024,
};

// Background cleanup (lib/gc.ts) - runs in-process on this interval, no external cron needed.
export const GC_INTERVAL_MS = 8 * 60 * 60 * 1000;

// Update check (admin overview banner) - repo slug is a placeholder until the real one is known.
export const UPDATE_CHECK = {
  repo: "not-akari/mangayomi-sync-server",
  cacheMs: 6 * 60 * 60 * 1000,
};

// Misc UI/data constants
export const SEARCH_DEBOUNCE_MS = 300;
export const REDEMPTIONS_SEARCH_THRESHOLD = 25;
export const BYTES_PER_MB = 1024 * 1024;
// 7 days is comfortably past every limiter's own resetAfterMs/windowMs (longest is 24h), well past being load-bearing.
export const RATE_LIMIT_STALE_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
