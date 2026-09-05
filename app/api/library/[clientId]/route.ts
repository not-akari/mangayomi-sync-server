import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { libraryRepository } from "@/lib/repositories/library-repository";
import { requireUser } from "@/lib/api/api-guards";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ clientId: string }> },
): Promise<NextResponse> {
  const t = await getTranslations("Api");
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const { clientId } = await params;
  const parsed = Number(clientId);
  if (!Number.isSafeInteger(parsed)) {
    return NextResponse.json({ error: t("invalidId") }, { status: 400 });
  }

  const entry = await libraryRepository.getDetail(user.id, parsed);
  if (!entry) {
    return NextResponse.json({ error: t("notFound") }, { status: 404 });
  }

  return NextResponse.json({ entry, blurNsfw: user.blurNsfw });
}
