// Only a relative same-origin path is allowed, to avoid an open redirect.
export function isSafeNext(
  next: string | string[] | undefined,
): next is string {
  return (
    typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
  );
}
