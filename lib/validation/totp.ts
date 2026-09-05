import { z } from "zod";

export const totpEnableSchema = z.object({
  secret: z.string().min(1).max(64),
  code: z.string().regex(/^\d{6}$/),
});

export const totpDisableSchema = z.object({
  password: z.string().min(1),
});

// `code` also accepts a recovery code (XXXXX-XXXXX), not just a 6-digit TOTP - checked as either shape server-side.
export const loginTotpSchema = z.object({
  pendingToken: z.string().min(1).max(512),
  code: z.string().min(6).max(16),
});
