-- IP addresses are personal data and were stored in plaintext: in User.registeredIp
-- and inside RateLimitAttempt.key (e.g. "login:1.2.3.4"). Both are now keyed hashes.

-- Existing plaintext addresses cannot be converted here, because the HMAC key lives
-- in the application (SESSION_SECRET), not in the database. They are dropped rather
-- than carried forward in the clear. The only cost is that ban-evasion matching
-- restarts from the next registration.
ALTER TABLE "User" RENAME COLUMN "registeredIp" TO "registeredIpHash";
UPDATE "User" SET "registeredIpHash" = NULL;

-- Rate-limit rows are transient and self-expire, so the old keys are simply cleared.
DELETE FROM "RateLimitAttempt";
