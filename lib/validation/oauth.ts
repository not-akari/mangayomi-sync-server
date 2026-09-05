import { z } from "zod";

export const oauthTokenSchema = z.object({
  code: z.string().min(1).max(256),
  codeVerifier: z.string().min(43).max(128),
  redirectUri: z.string().min(1).max(512),
});

export type OAuthTokenInput = z.infer<typeof oauthTokenSchema>;
