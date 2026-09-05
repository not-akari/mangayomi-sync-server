import { UPDATE_CHECK } from "@/lib/config";
import packageJson from "../../package.json";

export interface UpdateCheckResult {
  currentVersion: string;
  latestVersion: string | null;
  latestUrl: string | null;
  updateAvailable: boolean;
}

let cached: { result: UpdateCheckResult; fetchedAt: number } | null = null;

function parseVersion(v: string): number[] {
  return v
    .replace(/^v/, "")
    .split(".")
    .map((n) => parseInt(n, 10) || 0);
}

function isNewer(latest: string, current: string): boolean {
  const a = parseVersion(latest);
  const b = parseVersion(current);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x > y;
  }
  return false;
}

// In-memory cache since this hits GitHub's API - fine per-instance, avoided on every admin page load.
export async function checkForUpdate(): Promise<UpdateCheckResult> {
  const currentVersion = packageJson.version;
  if (cached && Date.now() - cached.fetchedAt < UPDATE_CHECK.cacheMs) {
    return cached.result;
  }

  let result: UpdateCheckResult = {
    currentVersion,
    latestVersion: null,
    latestUrl: null,
    updateAvailable: false,
  };
  try {
    const response = await fetch(
      `https://api.github.com/repos/${UPDATE_CHECK.repo}/releases/latest`,
      {
        headers: { Accept: "application/vnd.github+json" },
        signal: AbortSignal.timeout(5000),
      },
    );
    if (response.ok) {
      const data: { tag_name?: string; html_url?: string } =
        await response.json();
      const latestVersion = (data.tag_name ?? "").replace(/^v/, "");
      if (latestVersion) {
        result = {
          currentVersion,
          latestVersion,
          latestUrl: data.html_url ?? null,
          updateAvailable: isNewer(latestVersion, currentVersion),
        };
      }
    }
  } catch {
    // Network failure or repo has no releases yet - fail quiet, nothing to show the admin.
  }

  cached = { result, fetchedAt: Date.now() };
  return result;
}
