import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const AVATAR_DIR =
  process.env.AVATAR_STORAGE_DIR ??
  path.join(process.cwd(), "storage", "avatars");

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

const MIME_TYPE_BY_EXTENSION: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
};

export function extensionForMimeType(mimeType: string): string | null {
  return EXTENSION_BY_MIME_TYPE[mimeType] ?? null;
}

// The browser's declared Content-Type is just a client claim, not a guarantee - checked against the actual file signature instead.
export function sniffImageMimeType(buffer: Buffer): string | null {
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

// A user only has one avatar at a time but the extension varies - clear every extension before writing so an old jpg doesn't linger.
export async function deleteAvatarFile(userId: string): Promise<void> {
  await mkdir(AVATAR_DIR, { recursive: true });
  const entries = await readdir(/* turbopackIgnore: true */ AVATAR_DIR);
  await Promise.all(
    entries
      .filter((name) => name.startsWith(`${userId}.`))
      .map((name) =>
        rm(path.join(/* turbopackIgnore: true */ AVATAR_DIR, name), {
          force: true,
        }),
      ),
  );
}

export async function saveAvatarFile(
  userId: string,
  buffer: Buffer,
  mimeType: string,
): Promise<void> {
  const extension = extensionForMimeType(mimeType);
  if (!extension) {
    throw new Error(`Unsupported avatar mime type: ${mimeType}`);
  }
  await deleteAvatarFile(userId);
  await writeFile(
    path.join(/* turbopackIgnore: true */ AVATAR_DIR, `${userId}.${extension}`),
    buffer,
  );
}

export async function readAvatarFile(
  userId: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  await mkdir(AVATAR_DIR, { recursive: true });
  const entries = await readdir(/* turbopackIgnore: true */ AVATAR_DIR);
  const match = entries.find((name) => name.startsWith(`${userId}.`));
  if (!match) return null;

  const extension = match.slice(userId.length + 1);
  const contentType = MIME_TYPE_BY_EXTENSION[extension];
  if (!contentType) return null;

  const buffer = await readFile(
    path.join(/* turbopackIgnore: true */ AVATAR_DIR, match),
  );
  return { buffer, contentType };
}
