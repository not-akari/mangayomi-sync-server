import { z } from "zod";

export const avatarUrlSchema = z.object({
  // Restricted to http(s) rather than any well-formed URL - rules out javascript: entirely instead of relying on browser behavior.
  url: z.httpUrl().max(2048),
});
