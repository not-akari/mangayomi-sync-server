import * as argon2 from "argon2";

export function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain);
}

export function verifyPassword(hash: string, plain: string): Promise<boolean> {
  return argon2.verify(hash, plain);
}

let dummyHash: Promise<string> | null = null;

// Hashed once and reused so a nonexistent-user login still pays argon2's cost, keeping response time from leaking which case it was.
export function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword("dummy-password-for-timing-safety");
  return dummyHash;
}
