import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { userRepository } from "@/lib/repositories/user-repository";
import { requireUser, parseJsonBody } from "@/lib/api/api-guards";

const updateSchema = z.object({
  blurNsfw: z.boolean(),
});

export async function PATCH(request: Request): Promise<NextResponse> {
  const t = await getTranslations("Api");
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const parsedBody = await parseJsonBody(
    request,
    updateSchema,
    t("invalidRequest"),
  );
  if (parsedBody instanceof NextResponse) return parsedBody;
  const parsed = parsedBody;

  const updated = await userRepository.updateBlurNsfw(
    user.id,
    parsed.data.blurNsfw,
  );
  return NextResponse.json({ blurNsfw: updated.blurNsfw });
}
