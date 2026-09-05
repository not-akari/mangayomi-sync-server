import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

// Encrypts a handful of secrets that must be readable back in plaintext by the
// server itself (a TOTP secret to verify a code against, an SMTP password to
// authenticate with) and so can't just be hashed like a real password. This
// keeps them out of a plain database dump - reading them still requires
// SESSION_SECRET, which doesn't live in the database.

let cachedKey: Buffer | null = null;

function encryptionKey(): Buffer {
  if (cachedKey) return cachedKey;
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is required before encrypting secrets");
  }
  // Derived rather than reused directly, so this isn't literally the session signing key.
  cachedKey = createHash("sha256")
    .update(`${secret}:secret-encryption:v1`)
    .digest();
  return cachedKey;
}

// AES-256-GCM: a fresh random IV per call, joined with the auth tag and
// ciphertext as base64 segments so the whole thing stays one plain string,
// same shape as every other text column it replaces.
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(".");
}

export function decryptSecret(encrypted: string): string {
  const [ivPart, tagPart, dataPart] = encrypted.split(".");
  if (!ivPart || !tagPart || !dataPart) {
    throw new Error("Malformed encrypted secret");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivPart, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagPart, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(dataPart, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
