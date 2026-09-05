"use client";

// Pulls the `{ error }` shape every API route responds with on failure, falling back otherwise.
export async function extractErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  const data: unknown = await response.json().catch(() => null);
  return data && typeof data === "object" && "error" in data
    ? String((data as { error: unknown }).error)
    : fallback;
}
