import { isStringArray } from "@/lib/utils";

export interface NsfwConfig {
  nsfwGenreTags: string[];
  nsfwKeywords: string[];
  nsfwSymbols: string[];
}

/** Hands the current NSFW lists to the browser as a JSON download. */
export function downloadNsfwConfig(config: NsfwConfig): void {
  const blob = new Blob([JSON.stringify(config, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "nsfw-config.json";
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Reads a config file, returning null when it is missing or malformed. */
export async function readNsfwConfigFile(
  file: File,
): Promise<NsfwConfig | null> {
  let data: unknown;
  try {
    data = JSON.parse(await file.text());
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;
  const record = data as Record<string, unknown>;
  if (
    !isStringArray(record.nsfwGenreTags) ||
    !isStringArray(record.nsfwKeywords) ||
    !isStringArray(record.nsfwSymbols)
  ) {
    return null;
  }
  return {
    nsfwGenreTags: record.nsfwGenreTags,
    nsfwKeywords: record.nsfwKeywords,
    nsfwSymbols: record.nsfwSymbols,
  };
}
