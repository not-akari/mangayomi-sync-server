import { db } from "@/lib/db";
import type { DbClient } from "./client";

export function withTransaction<T>(
  fn: (client: DbClient) => Promise<T>,
  options?: { timeoutMs?: number },
): Promise<T> {
  return db.$transaction(
    fn,
    options?.timeoutMs === undefined
      ? undefined
      : { timeout: options.timeoutMs },
  );
}
