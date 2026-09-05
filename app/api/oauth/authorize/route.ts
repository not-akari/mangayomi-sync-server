import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/auth";
import { isAllowedRedirectUri } from "@/lib/auth/oauth";
import { oauthRepository } from "@/lib/repositories/oauth-repository";
import { getRequestOrigin } from "@/lib/api/request-origin";

// Opened in a system browser. If not logged in, bounces through /login and back.
export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const redirectUri = url.searchParams.get("redirect_uri") ?? "";
  const codeChallenge = url.searchParams.get("code_challenge") ?? "";
  const codeChallengeMethod = url.searchParams.get("code_challenge_method");
  const state = url.searchParams.get("state") ?? "";

  if (
    !redirectUri ||
    !isAllowedRedirectUri(redirectUri) ||
    !codeChallenge ||
    codeChallengeMethod !== "S256"
  ) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const user = await getSessionUser();
  if (!user) {
    const next = `${url.pathname}${url.search}`;
    const origin = getRequestOrigin(request);
    return NextResponse.redirect(
      new URL(`/login?next=${encodeURIComponent(next)}`, origin),
    );
  }

  const code = await oauthRepository.create(user.id, codeChallenge, redirectUri);
  const callback = new URL(redirectUri);
  callback.searchParams.set("code", code);
  if (state) callback.searchParams.set("state", state);
  return NextResponse.redirect(callback);
}
