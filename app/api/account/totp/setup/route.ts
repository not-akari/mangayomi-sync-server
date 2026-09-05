import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { generateTotpSecret, totpUri } from "@/lib/auth/totp";
import { serverSettingsRepository } from "@/lib/repositories/server-settings-repository";
import { requireUser } from "@/lib/api/api-guards";

// Returns a fresh secret unsaved. It's only stored once /api/account/totp/enable confirms it works.
export async function POST(): Promise<NextResponse> {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const { siteName } = await serverSettingsRepository.get();
  const secret = generateTotpSecret();
  const uri = totpUri(secret, user.username, siteName || "Mangayomi Sync");
  const qrSvg = await QRCode.toString(uri, { type: "svg", margin: 1 });

  return NextResponse.json({ secret, uri, qrSvg });
}
