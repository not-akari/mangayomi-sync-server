import { SignJWT, jwtVerify } from "jose";
import { sessionRepository } from "@/lib/repositories/session-repository";
import { serverSettingsRepository } from "@/lib/repositories/server-settings-repository";
import type { Session, User } from "@prisma/client";

// The name is load-bearing: the Flutter client parses `Set-Cookie: id=...;` literally and never decodes the value itself.
export const SESSION_COOKIE_NAME = "id";

const JWT_ALG = "HS256";

// Exported so login/register/setup routes stay in sync with the JWT's actual expiry instead of a second hardcoded number.
export async function getSessionDurationSeconds(): Promise<number> {
  const { sessionDurationDays } = await serverSettingsRepository.get();
  return sessionDurationDays * 24 * 60 * 60;
}

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET is not set. Generate one with `openssl rand -base64 48` and put it in .env.",
    );
  }
  return new TextEncoder().encode(secret);
}

// The Session row's id is embedded as the JWT's `jti` so a `revoked` flag can be checked per-request, giving instant revocation.

// durationSecondsOverride issues a shorter-lived token for "stay logged in" unchecked, in case the browser restores the session anyway.
export async function createSession(
  userId: string,
  durationSecondsOverride?: number,
): Promise<string> {
  const [session, durationSeconds] = await Promise.all([
    sessionRepository.create(userId),
    durationSecondsOverride ?? getSessionDurationSeconds(),
  ]);
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: JWT_ALG })
    .setJti(session.id)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + durationSeconds)
    .sign(getSecretKey());
}

export async function resolveSession(token: string): Promise<User | null> {
  const jti = await getSessionId(token);
  if (!jti) return null;

  const session = await sessionRepository.findByIdWithUser(jti);
  if (!session || session.revoked) return null;
  // Stops a request the instant an admin suspends someone, without waiting on that session's own revocation to have run.
  if (session.user.suspended) return null;
  return session.user;
}

export async function getSessionId(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: [JWT_ALG],
    });
    return payload.jti ?? null;
  } catch {
    return null;
  }
}

export function listSessions(userId: string): Promise<Session[]> {
  return sessionRepository.listActiveByUserId(userId);
}

export async function revokeSessionById(
  id: string,
  userId: string,
): Promise<void> {
  await sessionRepository.revokeByIdForUser(id, userId);
}

export async function revokeSession(token: string): Promise<void> {
  const jti = await getSessionId(token);
  if (!jti) return;
  await sessionRepository.revokeById(jti);
}
