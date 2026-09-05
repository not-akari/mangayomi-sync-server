import { NextResponse } from "next/server";
import { z } from "zod";
import type { AdminScope, User } from "@prisma/client";
import { getSessionUser } from "@/lib/auth/auth";
import { hasScope } from "@/lib/auth/permissions";

export async function requireUser(): Promise<User | NextResponse> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return user;
}

export async function requireScope(
  scope: AdminScope,
): Promise<User | NextResponse> {
  const user = await getSessionUser();
  if (!user || !hasScope(user, scope)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return user;
}

// Callers check `if (result instanceof NextResponse) return result;` then use `.data`.
export async function parseJsonBody<T>(
  request: Request,
  schema: z.ZodType<T>,
  invalidMessage: string,
  emptyBodyFallback?: unknown,
): Promise<{ data: T } | NextResponse> {
  const body: unknown = await request.json().catch(() => null);
  const parsed = schema.safeParse(body ?? emptyBodyFallback ?? null);
  if (!parsed.success) {
    return NextResponse.json({ error: invalidMessage }, { status: 400 });
  }
  return { data: parsed.data };
}

export function tooManyRequests(
  retryAfterSeconds: number,
  message: string,
): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}
