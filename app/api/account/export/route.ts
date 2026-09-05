import { NextResponse } from "next/server";
import { exportRepository } from "@/lib/repositories/export-repository";
import { requireUser } from "@/lib/api/api-guards";

// BigInt ids don't serialize through JSON.stringify by default - this is the one response that touches them directly.
function bigIntSafe(_key: string, value: unknown): unknown {
  return typeof value === "bigint" ? value.toString() : value;
}

export async function GET(): Promise<Response> {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const data = await exportRepository.exportUserData(user.id);
  const body = JSON.stringify(
    { exportedAt: new Date().toISOString(), ...data },
    bigIntSafe,
    2,
  );

  return new Response(body, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="mangayomi-export-${user.username}.json"`,
    },
  });
}
