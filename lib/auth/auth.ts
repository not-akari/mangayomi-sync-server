import { cookies } from "next/headers";
import {
  resolveSession,
  getSessionId,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";
import type { User } from "@prisma/client";

export async function getSessionUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return resolveSession(token);
}

export async function getCurrentSessionId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return getSessionId(token);
}
