import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { readAvatarFile } from "@/lib/services/avatar-storage";
import { serverSettingsRepository } from "@/lib/repositories/server-settings-repository";

// Publicly readable, no session check - gating it behind auth would just break <img> tags for other users viewing shared data.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
): Promise<NextResponse | Response> {
  const t = await getTranslations("Api");
  const { avatarsEnabled } = await serverSettingsRepository.get();
  if (!avatarsEnabled) {
    return NextResponse.json({ error: t("notFound") }, { status: 404 });
  }
  const { userId } = await params;
  const file = await readAvatarFile(userId);
  if (!file) {
    return NextResponse.json({ error: t("notFound") }, { status: 404 });
  }
  return new Response(new Uint8Array(file.buffer), {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "private, max-age=300",
    },
  });
}
