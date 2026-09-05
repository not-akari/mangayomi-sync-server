import type { useRouter } from "next/navigation";

// An API route needs a real browser navigation to follow its redirect.
export function completeAuth(
  next: string,
  router: ReturnType<typeof useRouter>,
): void {
  if (next.startsWith("/api/")) {
    window.location.href = next;
    return;
  }
  router.push(next);
  router.refresh();
}
