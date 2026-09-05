import { sweepStaleRateLimitAttempts } from "@/lib/api/rate-limit";
import { passwordResetRepository } from "@/lib/repositories/password-reset-repository";
import { oauthRepository } from "@/lib/repositories/oauth-repository";
import { sessionRepository } from "@/lib/repositories/session-repository";
import { GC_INTERVAL_MS } from "@/lib/config";

// InviteCode and Tombstone are deliberately NOT cleaned up here - InviteCode stays valid history, Tombstone can't be safely aged out.
async function runGc(): Promise<void> {
  const [rateLimitCount, sessionCount, passwordResetCount, oauthCodeCount] =
    await Promise.all([
      sweepStaleRateLimitAttempts(),
      sessionRepository
        .deleteRevokedOlderThan(new Date(Date.now() - 24 * 60 * 60 * 1000))
        .then((r) => r.count),
      passwordResetRepository.deleteDead(new Date()).then((r) => r.count),
      oauthRepository.deleteDead(new Date()).then((r) => r.count),
    ]);

  console.log(
    `gc: removed ${rateLimitCount} rate limit rows, ${sessionCount} revoked sessions, ${passwordResetCount} dead password reset tokens, ${oauthCodeCount} dead oauth codes`,
  );
}

let started = false;

// Called once from instrumentation.ts on server boot - guarded since Next.js can invoke register() more than once.
export function startGcScheduler(): void {
  if (started) return;
  started = true;
  runGc().catch((error: unknown) => console.error("gc failed:", error));
  setInterval(() => {
    runGc().catch((error: unknown) => console.error("gc failed:", error));
  }, GC_INTERVAL_MS);
}
